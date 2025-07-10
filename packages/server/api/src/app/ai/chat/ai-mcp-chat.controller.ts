import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { getAiProviderLanguageModel } from '@openops/common';
import { encryptUtils, logger } from '@openops/server-shared';
import {
  AiConfig,
  DeleteChatHistoryRequest,
  GetAllChatsResponse,
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
import { StatusCodes } from 'http-status-codes';
import {
  sendAiChatFailureEvent,
  sendAiChatMessageSendEvent,
} from '../../telemetry/event-models/ai';
import { aiConfigService } from '../config/ai-config.service';
import { getMCPTools } from '../mcp/mcp-tools';
import {
  createChatContext,
  deleteChatHistory,
  generateChatIdForMCP,
  getAllChatsForUserAndProject,
  getChatContext,
  getChatHistory,
  saveChatHistory,
} from './ai-chat.service';
import { generateMessageId } from './ai-message-id-generator';
import { getMcpSystemPrompt, getSystemPrompt } from './prompts.service';
import { selectRelevantTools } from './tools.service';

const MAX_RECURSION_DEPTH = 10;
export const aiMCPChatController: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/all',
    GetAllChatsOptions,
    async (request, reply): Promise<GetAllChatsResponse> => {
      const userId = request.principal.id;
      const projectId = request.principal.projectId;

      const chats = await getAllChatsForUserAndProject(userId, projectId);
      return reply.code(200).send({
        chats: chats.map((chat) => ({
          chatId: chat.chatId,
          context: chat.context,
          messages: chat.messages,
        })),
      });
    },
  );

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
          const messages = await getChatHistory(inputChatId, userId, projectId);
          return reply.code(200).send({
            chatId: inputChatId,
            messages,
          });
        }
      }

      const newChatId = openOpsId();
      const chatId = generateChatIdForMCP({
        chatId: newChatId,
        userId,
      });
      const chatContext = { ...request.body, chatId: newChatId };

      await createChatContext(chatId, userId, projectId, chatContext);
      const messages = await getChatHistory(chatId, userId, projectId);

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
    const chatContext = await getChatContext(chatId, userId, projectId);
    if (!chatContext) {
      return reply
        .code(404)
        .send('No chat session found for the provided chat ID.');
    }

    const aiConfig = await aiConfigService.getActiveConfigWithApiKey(projectId);
    if (!aiConfig) {
      return reply
        .code(404)
        .send('No active AI configuration found for the project.');
    }

    const apiKey = encryptUtils.decryptString(JSON.parse(aiConfig.apiKey));
    const languageModel = await getAiProviderLanguageModel({
      apiKey,
      model: aiConfig.model,
      provider: aiConfig.provider,
      providerSettings: aiConfig.providerSettings,
    });

    const messages = await getChatHistory(chatId, userId, projectId);
    messages.push({
      role: 'user',
      content: request.body.message,
    });

    let systemPrompt;
    let mcpClients: unknown[] = [];
    let relevantTools: ToolSet | undefined;

    if (
      !chatContext.actionName ||
      !chatContext.blockName ||
      !chatContext.stepName ||
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
      systemPrompt = await getSystemPrompt(chatContext);
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
        const message = error instanceof Error ? error.message : String(error);
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
  });

  app.delete('/:chatId', DeleteChatOptions, async (request, reply) => {
    const { chatId } = request.params;
    const userId = request.principal.id;
    const projectId = request.principal.projectId;

    try {
      await deleteChatHistory(chatId, userId, projectId);
      return await reply.code(StatusCodes.OK).send();
    } catch (error) {
      logger.error('Failed to delete chat history with error: ', error);
      return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
        message: 'Failed to delete chat history',
      });
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

const GetAllChatsOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description:
      'Retrieve all MCP chat sessions for the authenticated user and project. This endpoint returns all chat IDs, contexts, and messages for the user.',
    response: {
      200: GetAllChatsResponse,
    },
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
    async onStepFinish({ finishReason }): Promise<void> {
      stepCount++;
      if (finishReason !== 'stop' && stepCount >= MAX_RECURSION_DEPTH) {
        const message = `Maximum recursion depth (${MAX_RECURSION_DEPTH}) reached. Terminating recursion.`;
        endStreamWithErrorMessage(dataStreamWriter, message);
        logger.warn(message);
      }
    },
    async onFinish({ response }): Promise<void> {
      const filteredMessages = removeToolMessages(messages);
      response.messages.forEach((r) => {
        filteredMessages.push(getResponseObject(r));
      });

      await saveChatHistory(chatId, userId, projectId, filteredMessages);
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

function removeToolMessages(messages: CoreMessage[]): CoreMessage[] {
  return messages.filter((m) => {
    if (m.role === 'tool') {
      return false;
    }

    if (m.role === 'assistant' && Array.isArray(m.content)) {
      const newContent = m.content.filter((part) => part.type !== 'tool-call');

      if (newContent.length === 0) {
        return false;
      }

      m.content = newContent;
    }

    return true;
  });
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
