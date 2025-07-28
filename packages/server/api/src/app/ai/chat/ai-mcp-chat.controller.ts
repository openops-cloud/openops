import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { isLLMTelemetryEnabled } from '@openops/common';
import { logger } from '@openops/server-shared';
import {
  AiConfig,
  ApplicationError,
  ChatNameRequest,
  DeleteChatHistoryRequest,
  NewMessageRequest,
  OpenChatMCPRequest,
  OpenChatResponse,
  openOpsId,
  PrincipalType,
} from '@openops/shared';
import {
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  DataStreamWriter,
  LanguageModel,
  pipeDataStreamToResponse,
  streamText,
  TextPart,
  ToolCallPart,
  ToolChoice,
  ToolResultPart,
  ToolSet,
} from 'ai';
import { FastifyReply } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import {
  sendAiChatFailureEvent,
  sendAiChatMessageSendEvent,
} from '../../telemetry/event-models/ai';
import { getMCPTools } from '../mcp/mcp-tools';
import {
  createChatContext,
  deleteChatHistory,
  generateChatId,
  generateChatIdForMCP,
  generateChatName,
  getChatContext,
  getChatHistoryWithMergedTools,
  getConversation,
  getLLMConfig,
  MCPChatContext,
  saveChatHistory,
} from './ai-chat.service';
import { generateMessageId } from './ai-message-id-generator';
import { streamCode } from './code.service';
import { enrichContext, IncludeOptions } from './context-enrichment.service';
import { getBlockSystemPrompt, getMcpSystemPrompt } from './prompts.service';
import { selectRelevantTools } from './tools.service';

const MAX_RECURSION_DEPTH = 10;
export const aiMCPChatController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/open',
    OpenChatOptions,
    async (request, reply): Promise<OpenChatResponse> => {
      const { chatId: inputChatId } = request.body;
      const { id: userId, projectId } = request.principal;

      if (inputChatId) {
        const existingContext = await getChatContext(
          inputChatId,
          userId,
          projectId,
        );

        if (existingContext) {
          const messages = await getChatHistoryWithMergedTools(
            inputChatId,
            userId,
            projectId,
          );
          return reply.code(200).send({
            chatId: inputChatId,
            messages,
          });
        }
      } else if (
        request.body.workflowId &&
        request.body.blockName &&
        request.body.stepId &&
        request.body.actionName
      ) {
        const context: MCPChatContext = {
          workflowId: request.body.workflowId,
          blockName: request.body.blockName,
          stepId: request.body.stepId,
          actionName: request.body.actionName,
        };

        const chatId = generateChatId({
          ...context,
          userId,
        });

        const messages = await getChatHistoryWithMergedTools(
          chatId,
          userId,
          projectId,
        );

        if (messages.length === 0) {
          await createChatContext(chatId, userId, projectId, context);
        }

        return reply.code(200).send({
          chatId,
          messages,
        });
      }

      const newChatId = openOpsId();
      const chatId = generateChatIdForMCP({
        chatId: newChatId,
        userId,
      });
      const chatContext = {
        ...request.body,
        chatId: newChatId,
      };

      await createChatContext(chatId, userId, projectId, chatContext);
      const messages = await getChatHistoryWithMergedTools(
        chatId,
        userId,
        projectId,
      );

      return reply.code(200).send({
        chatId,
        messages,
      });
    },
  );
  app.post('/', NewMessageOptions, async (request, reply) => {
    const chatId = request.body.chatId;
    const projectId = request.principal.projectId;
    const userId = request.principal.id;

    try {
      const conversationResult = await getConversation(
        chatId,
        userId,
        projectId,
      );
      const llmConfigResult = await getLLMConfig(projectId);
      const messageContent = await getUserMessage(request.body, reply);
      if (messageContent === null) {
        return; // Error response already sent
      }
      conversationResult.messages.push({
        role: 'user',
        content: messageContent,
      });

      const { chatContext, messages } = conversationResult;
      const { aiConfig, languageModel } = llmConfigResult;

      let systemPrompt;
      let mcpClients: unknown[] = [];
      let relevantTools: ToolSet | undefined;

      if (
        !chatContext.actionName ||
        !chatContext.blockName ||
        !chatContext.stepId ||
        !chatContext.workflowId
      ) {
        const toolSet = await getMCPTools(
          app,
          request.headers.authorization?.replace('Bearer ', '') ?? '',
          projectId,
        );

        mcpClients = toolSet.mcpClients;
        mcpClients = toolSet.mcpClients;

        const filteredTools = await selectRelevantTools({
          messages,
          tools: toolSet.tools,
          languageModel,
          aiConfig,
        });

        const isAwsCostMcpDisabled =
          !hasToolProvider(toolSet.tools, 'cost-analysis') &&
          !hasToolProvider(toolSet.tools, 'cost-explorer');

        const isAnalyticsLoaded = hasToolProvider(filteredTools, 'superset');
        const isTablesLoaded = hasToolProvider(filteredTools, 'tables');
        const isOpenOpsMCPEnabled = hasToolProvider(filteredTools, 'openops');

        relevantTools = {
          ...filteredTools,
          ...(isOpenOpsMCPEnabled
            ? collectToolsByProvider(toolSet.tools, 'openops')
            : {}),
        };

        systemPrompt = await getMcpSystemPrompt({
          isAnalyticsLoaded,
          isTablesLoaded,
          isOpenOpsMCPEnabled,
          isAwsCostMcpDisabled,
        });
      } else {
        systemPrompt = await getBlockSystemPrompt(chatContext);
      }

      pipeDataStreamToResponse(reply.raw, {
        execute: async (dataStreamWriter) => {
          logger.debug('Send user message to LLM.');
          await streamMessages(
            dataStreamWriter,
            languageModel,
            systemPrompt,
            aiConfig,
            messages,
            chatId,
            mcpClients,
            userId,
            projectId,
            relevantTools,
          );
        },

        onError: (error) => {
          const message =
            error instanceof Error ? error.message : String(error);
          sendAiChatFailureEvent({
            projectId,
            userId: request.principal.id,
            chatId,
            errorMessage: message,
            provider: aiConfig.provider,
            model: aiConfig.model,
          });

          endStreamWithErrorMessage(reply.raw, message);
          closeMCPClients(mcpClients).catch((e) =>
            logger.warn('Failed to close mcp client.', e),
          );
          logger.warn(message, error);
          return message;
        },
      });

      sendAiChatMessageSendEvent({
        projectId,
        userId: request.principal.id,
        chatId,
        provider: aiConfig.provider,
      });
    } catch (error) {
      return handleError(error, reply, 'conversation');
    }
  });

  app.post('/chat-name', ChatNameOptions, async (request, reply) => {
    const chatId = request.body.chatId;
    const userId = request.principal.id;
    const projectId = request.principal.projectId;

    try {
      const contextForChatName = await getConversation(
        chatId,
        userId,
        projectId,
      );
      const messages = contextForChatName.messages;

      if (messages.length === 0) {
        const chatName = 'New Chat';
        return await reply.code(200).send({ chatName });
      }

      let rawChatName: string;
      try {
        rawChatName = await generateChatName(messages, projectId);
      } catch (error) {
        try {
          rawChatName = await generateChatName(messages, projectId);
        } catch (finalError) {
          return await handleError(finalError, reply, 'generate chat name');
        }
      }

      const chatName = rawChatName.trim() || 'New Chat';

      return await reply.code(200).send({ chatName });
    } catch (error) {
      return handleError(error, reply, 'generate chat name');
    }
  });

  app.post('/code', CodeGenerationOptions, async (request, reply) => {
    const chatId = request.body.chatId;
    const projectId = request.principal.projectId;
    const userId = request.principal.id;

    try {
      const conversationResult = await getConversation(
        chatId,
        userId,
        projectId,
      );
      const llmConfigResult = await getLLMConfig(projectId);

      conversationResult.messages.push({
        role: 'user',
        content: request.body.message,
      });

      const { chatContext, messages } = conversationResult;
      const { aiConfig, languageModel } = llmConfigResult;

      const enrichedContext = request.body.additionalContext
        ? await enrichContext(request.body.additionalContext, projectId, {
            includeCurrentStepOutput: IncludeOptions.ALWAYS,
          })
        : undefined;

      const prompt = await getBlockSystemPrompt(chatContext, enrichedContext);

      const result = streamCode({
        messages,
        languageModel,
        aiConfig,
        systemPrompt: prompt,
        onFinish: async (result) => {
          const assistantMessage: CoreMessage = {
            role: 'assistant',
            content: JSON.stringify(result.object),
          };
          logger.debug('streamCode finished', {
            result,
          });

          await saveChatHistory(chatId, userId, projectId, [
            ...messages,
            assistantMessage,
          ]);
        },
        onError: (error) => {
          logger.error('Failed to generate code', {
            error,
          });
          throw error;
        },
      });

      return result.toTextStreamResponse();
    } catch (error) {
      return handleError(error, reply, 'code generation');
    }
  });

  app.delete('/:chatId', DeleteChatOptions, async (request, reply) => {
    const { chatId } = request.params;
    const userId = request.principal.id;
    const projectId = request.principal.projectId;

    try {
      await deleteChatHistory(chatId, userId, projectId);
      return await reply.code(StatusCodes.OK).send();
    } catch (error) {
      return handleError(error, reply, 'delete chat history');
    }
  });
};

const OpenChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description:
      'Initialize a new MCP chat session or resume an existing one. This endpoint creates a unique chat ID and context for the conversation, supporting integration with MCP tools and services.',
    body: OpenChatMCPRequest,
  },
};

const NewMessageOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description:
      'Send a message to the MCP chat session and receive a streaming response. This endpoint processes the user message, generates an AI response using the configured language model, and maintains the conversation history while integrating with MCP tools.',
    body: NewMessageRequest,
  },
};

const ChatNameOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description: 'Generate a chat name using LLM based on chat history.',
    body: ChatNameRequest,
  },
};

const CodeGenerationOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description:
      "Generate code based on the user's request. This endpoint processes the user message and generates a code response using the configured language model.",
    body: NewMessageRequest,
  },
};

const DeleteChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description:
      'Delete an MCP chat session and its associated history. This endpoint removes all messages, context data, and MCP tool states for the specified chat ID, effectively ending the conversation.',
    params: DeleteChatHistoryRequest,
  },
};

async function streamMessages(
  dataStreamWriter: DataStreamWriter,
  languageModel: LanguageModel,
  systemPrompt: string,
  aiConfig: AiConfig,
  messages: CoreMessage[],
  chatId: string,
  mcpClients: unknown[],
  userId: string,
  projectId: string,
  tools?: ToolSet,
): Promise<void> {
  let stepCount = 0;

  let toolChoice: ToolChoice<Record<string, never>> = 'auto';
  if (!tools || Object.keys(tools).length === 0) {
    toolChoice = 'none';
    systemPrompt += `\n\nMCP tools are not available in this chat. Do not claim access or simulate responses from them under any circumstance.`;
  }

  const result = streamText({
    model: languageModel,
    system: systemPrompt,
    messages,
    ...aiConfig.modelSettings,
    tools,
    toolChoice,
    maxRetries: 1,
    maxSteps: MAX_RECURSION_DEPTH,
    experimental_telemetry: { isEnabled: isLLMTelemetryEnabled() },
    async onStepFinish({ finishReason }): Promise<void> {
      stepCount++;
      if (finishReason !== 'stop' && stepCount >= MAX_RECURSION_DEPTH) {
        const message = `Maximum recursion depth (${MAX_RECURSION_DEPTH}) reached. Terminating recursion.`;
        endStreamWithErrorMessage(dataStreamWriter, message);
        logger.warn(message);
      }
    },
    async onFinish({ response }): Promise<void> {
      await saveChatHistory(chatId, userId, projectId, [
        ...messages,
        ...response.messages.map(getResponseObject),
      ]);
      await closeMCPClients(mcpClients);
    },
  });

  result.mergeIntoDataStream(dataStreamWriter);
}

function endStreamWithErrorMessage(
  dataStreamWriter: NodeJS.WritableStream | DataStreamWriter,
  message: string,
): void {
  dataStreamWriter.write(`f:{"messageId":"${generateMessageId()}"}\n`);

  dataStreamWriter.write(`0:"${message}"\n`);

  dataStreamWriter.write(
    `e:{"finishReason":"stop","usage":{"promptTokens":null,"completionTokens":null},"isContinued":false}\n`,
  );
  dataStreamWriter.write(
    `d:{"finishReason":"stop","usage":{"promptTokens":null,"completionTokens":null}}\n`,
  );
}

function getResponseObject(
  message: CoreAssistantMessage | CoreToolMessage,
): CoreToolMessage | CoreAssistantMessage {
  const { role, content } = message;

  if (role === 'tool') {
    return {
      role: message.role,
      content: message.content as ToolResultPart[],
    };
  }

  if (Array.isArray(content)) {
    let hasToolCall = false;

    for (const part of content) {
      if (part.type === 'tool-call') {
        hasToolCall = true;
      } else if (part.type !== 'text') {
        return {
          role: 'assistant',
          content: `Invalid message type received. Type: ${part.type}`,
        };
      }
    }

    return {
      role,
      content: hasToolCall
        ? (content as ToolCallPart[])
        : (content as TextPart[]),
    };
  }

  return {
    role: 'assistant',
    content,
  };
}

async function closeMCPClients(mcpClients: unknown[]): Promise<void> {
  for (const mcpClient of mcpClients) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (mcpClient as any)?.close();
  }
}

function collectToolsByProvider(
  tools: ToolSet | undefined,
  provider: string,
): ToolSet {
  const result: ToolSet = {};
  for (const [key, tool] of Object.entries(tools ?? {})) {
    if ((tool as { toolProvider?: string }).toolProvider === provider) {
      result[key] = tool;
    }
  }
  return result;
}

export function hasToolProvider(
  tools: ToolSet | undefined,
  provider: string,
): boolean {
  return Object.values(tools ?? {}).some(
    (tool) => (tool as { toolProvider?: string }).toolProvider === provider,
  );
}

function handleError(
  error: unknown,
  reply: FastifyReply,
  context?: string,
): FastifyReply {
  if (error instanceof ApplicationError) {
    return reply.code(400).send({ message: error.message });
  }

  logger.error(`Failed to process ${context || 'request'} with error: `, error);
  return reply.code(500).send({ message: 'Internal server error' });
}

/**
 * Extracts the user message content from the request body.
 * Returns the message content as string, or null if validation fails (error response sent).
 */
async function getUserMessage(
  body: NewMessageRequest,
  reply: FastifyReply,
): Promise<string | null> {
  if (body.messages) {
    if (body.messages.length === 0) {
      await reply.code(400).send({
        message:
          'Messages array cannot be empty. Please provide at least one message or use the message field instead.',
      });
      return null;
    }

    const lastMessage = body.messages[body.messages.length - 1];
    if (
      !lastMessage.content ||
      !Array.isArray(lastMessage.content) ||
      lastMessage.content.length === 0
    ) {
      await reply.code(400).send({
        message:
          'Last message must have valid content array with at least one element.',
      });
      return null;
    }

    const firstContentElement = lastMessage.content[0];
    if (
      !firstContentElement ||
      typeof firstContentElement !== 'object' ||
      !('text' in firstContentElement)
    ) {
      await reply.code(400).send({
        message:
          'Last message must have a text content element as the first element.',
      });
      return null;
    }

    return String(firstContentElement.text);
  } else {
    return body.message;
  }
}
