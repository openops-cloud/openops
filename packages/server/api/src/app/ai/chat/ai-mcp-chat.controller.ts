import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { logger } from '@openops/server-shared';
import {
  ApplicationError,
  ChatFlowContext,
  ChatNameRequest,
  CODE_BLOCK_NAME,
  DeleteChatHistoryRequest,
  ListChatsResponse,
  NewMessageRequest,
  OpenChatMCPRequest,
  OpenChatResponse,
  openOpsId,
  PrincipalType,
} from '@openops/shared';
import { CoreMessage } from 'ai';
import { FastifyReply } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { v4 as uuidv4 } from 'uuid';
import {
  createChatContext,
  deleteChatHistory,
  generateChatId,
  generateChatIdForMCP,
  generateChatName,
  getAllChats,
  getChatContext,
  getChatHistoryWithMergedTools,
  getConversation,
  getLLMConfig,
  MCPChatContext,
  saveChatHistory,
  updateChatName,
} from './ai-chat.service';
import { streamCode } from './code.service';
import { enrichContext, IncludeOptions } from './context-enrichment.service';
import { getBlockSystemPrompt } from './prompts.service';
import { handleUserMessage } from './user-message-handler';

const DEFAULT_CHAT_NAME = 'New Chat';

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
    const userId = request.principal.id;
    const projectId = request.principal.projectId;
    const authToken =
      request.headers.authorization?.replace('Bearer ', '') ?? '';

    try {
      const messageContent = await getUserMessage(request.body, reply);
      if (messageContent === null) {
        return; // Error response already sent
      }

      const { chatContext } = await getConversation(chatId, userId, projectId);
      const isCodeGenerationRequest =
        chatContext?.blockName === CODE_BLOCK_NAME;

      if (isCodeGenerationRequest) {
        logger.debug('Using code generation flow');
        const response = await handleCodeGenerationRequest({
          chatId,
          userId,
          projectId,
          messageContent,
          additionalContext: request.body.additionalContext,
        });
        return response;
      } else {
        logger.debug('Using normal conversation flow');
        const newMessage: CoreMessage = {
          role: 'user',
          content: messageContent,
        };

        await handleUserMessage({
          app,
          chatId,
          userId,
          projectId,
          authToken,
          newMessage,
          serverResponse: reply.raw,
        });
        return;
      }
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
        return await reply.code(200).send({ chatName: DEFAULT_CHAT_NAME });
      }

      const rawChatName = await generateChatName(messages, projectId);
      const chatName = rawChatName.trim() || DEFAULT_CHAT_NAME;

      await updateChatName(chatId, userId, projectId, chatName);

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

  app.get('/all-chats', ListChatsOptions, async (request, reply) => {
    const userId = request.principal.id;
    const projectId = request.principal.projectId;

    try {
      const chats = await getAllChats(userId, projectId);
      return await reply.code(StatusCodes.OK).send({ chats });
    } catch (error) {
      return handleError(error, reply, 'list chats');
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

const ListChatsOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description:
      'This endpoint returns an array of all available chat sessions with chatId and chatName.',
    response: {
      200: ListChatsResponse,
    },
  },
};

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
 * Handles code generation requests using streamCode for structured output.
 */
async function handleCodeGenerationRequest({
  chatId,
  userId,
  projectId,
  messageContent,
  additionalContext,
}: {
  chatId: string;
  userId: string;
  projectId: string;
  messageContent: string;
  additionalContext?: ChatFlowContext;
}): Promise<Response> {
  try {
    const conversationResult = await getConversation(chatId, userId, projectId);
    const llmConfigResult = await getLLMConfig(projectId);

    conversationResult.messages.push({
      role: 'user',
      content: messageContent,
    });

    const { chatContext, messages } = conversationResult;
    const { aiConfig, languageModel } = llmConfigResult;

    const enrichedContext = additionalContext
      ? await enrichContext(additionalContext, projectId, {
          includeCurrentStepOutput: IncludeOptions.ALWAYS,
        })
      : undefined;

    const prompt = await getBlockSystemPrompt(chatContext, enrichedContext);

    logger.debug('Code generation prompt:', {
      chatContext: JSON.stringify(chatContext),
      enrichedContext: enrichedContext ? 'present' : 'absent',
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 200),
    });

    let codeResult: {
      type: string;
      code?: string;
      packageJson?: string;
      textAnswer: string;
    } | null = null;

    const result = streamCode({
      messages,
      languageModel,
      aiConfig,
      systemPrompt: prompt,
      onFinish: async (result) => {
        if (result.object) {
          codeResult = result.object;
        }
      },
      onError: (error) => {
        logger.error('Failed to generate code', {
          error,
        });
        throw error;
      },
    });

    // Wait for the stream to complete and get the result
    const streamResponse = result.toTextStreamResponse();
    const reader = streamResponse.body?.getReader();
    if (reader) {
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
      }
    }

    // Wait a bit for onFinish to be called
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!codeResult) {
      throw new Error('No code generation result received');
    }

    // Create a mock tool call response
    const toolCallId = uuidv4();

    // Create the streaming response manually
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send tool call start (use 9: prefix for tool calls)
        const toolCallMessage = {
          toolCallId,
          toolName: 'generate_code',
          args: { message: messageContent },
        };
        controller.enqueue(
          encoder.encode(`9:${JSON.stringify(toolCallMessage)}\n`),
        );

        // Send tool call result
        const toolResult = {
          toolCallId,
          result: {
            code:
              (codeResult as { code?: string; packageJson?: string }).code ||
              '',
            packageJson:
              (codeResult as { code?: string; packageJson?: string })
                .packageJson || '{}',
          },
        };
        controller.enqueue(encoder.encode(`a:${JSON.stringify(toolResult)}\n`));

        // Send finish message
        const finishMessage = {
          finishReason: 'tool-calls',
          usage: { promptTokens: null, completionTokens: null },
          isContinued: false,
        };
        controller.enqueue(
          encoder.encode(`e:${JSON.stringify(finishMessage)}\n`),
        );
        controller.enqueue(
          encoder.encode(`d:${JSON.stringify(finishMessage)}\n`),
        );

        // Send text content as part of the assistant message
        controller.enqueue(
          encoder.encode(
            `0:"${(codeResult as { textAnswer: string }).textAnswer}"\n`,
          ),
        );

        // Send finish for text message
        const textFinishMessage = {
          finishReason: 'stop',
          usage: { promptTokens: null, completionTokens: null },
          isContinued: false,
        };
        controller.enqueue(
          encoder.encode(`e:${JSON.stringify(textFinishMessage)}\n`),
        );
        controller.enqueue(
          encoder.encode(`d:${JSON.stringify(textFinishMessage)}\n`),
        );

        controller.close();
      },
    });

    // Save the conversation history in the correct format for mergeToolResultsIntoMessages
    const saveToolCallId = uuidv4();

    // Save assistant message with tool call and text (result will be merged by mergeToolResultsIntoMessages)
    const assistantMessage: CoreMessage = {
      role: 'assistant',
      content: [
        {
          type: 'tool-call',
          toolCallId: saveToolCallId,
          toolName: 'generate_code',
          args: { message: messageContent },
        },
        {
          type: 'text',
          text: (codeResult as { textAnswer: string }).textAnswer || '',
        },
      ],
    };

    // Save tool result message (will be merged into assistant message by mergeToolResultsIntoMessages)
    const toolResultMessage: CoreMessage = {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: saveToolCallId,
          toolName: 'generate_code',
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  code:
                    (codeResult as { code?: string; packageJson?: string })
                      .code || '',
                  packageJson:
                    (codeResult as { code?: string; packageJson?: string })
                      .packageJson || '{}',
                }),
              },
            ],
            isError: false,
          },
        },
      ],
    };

    await saveChatHistory(chatId, userId, projectId, [
      ...messages,
      assistantMessage,
      toolResultMessage,
    ]);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    logger.error('Error in handleCodeGenerationRequest:', error);
    throw error;
  }
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
