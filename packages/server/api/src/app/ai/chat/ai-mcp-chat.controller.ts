import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { validateAiProviderConfig } from '@openops/common';
import { logger } from '@openops/server-shared';
import {
  ApplicationError,
  ChatNameRequest,
  DeleteChatHistoryRequest,
  ErrorCode,
  ListChatsResponse,
  NewMessageRequest,
  OpenChatMCPRequest,
  OpenChatResponse,
  openOpsId,
  PrincipalType,
  UpdateChatModelRequest,
  UpdateChatModelResponse,
} from '@openops/shared';
import { ModelMessage } from 'ai';
import { FastifyReply } from 'fastify';
import { StatusCodes } from 'http-status-codes';
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
import { routeChatRequest } from './chat-request-router';
import { streamCode } from './code.service';
import { enrichContext, IncludeOptions } from './context-enrichment.service';
import { getBlockSystemPrompt } from './prompts.service';

const DEFAULT_CHAT_NAME = 'New Chat';

export const aiMCPChatController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/open',
    OpenChatOptions,
    async (request, reply): Promise<OpenChatResponse> => {
      const { chatId: inputChatId } = request.body;
      const { id: userId, projectId } = request.principal;

      const { aiConfig } = await getLLMConfig(projectId);

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
          let provider = existingContext.provider;
          let model = existingContext.model;

          if (
            !existingContext.provider ||
            !existingContext.model ||
            existingContext.provider !== aiConfig.provider
          ) {
            provider = aiConfig.provider;
            model = aiConfig.model;
            await createChatContext(inputChatId, userId, projectId, {
              ...existingContext,
              provider,
              model,
            });
          }
          return reply.code(200).send({
            chatId: inputChatId,
            provider,
            model,
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

        let provider = aiConfig.provider;
        let model = aiConfig.model;

        if (messages.length === 0) {
          await createChatContext(chatId, userId, projectId, {
            ...context,
            provider,
            model,
          });
        } else {
          const existingContext = await getChatContext(
            chatId,
            userId,
            projectId,
          );

          if (
            !existingContext?.provider ||
            !existingContext?.model ||
            existingContext?.provider !== aiConfig.provider
          ) {
            await createChatContext(chatId, userId, projectId, {
              ...existingContext,
              provider,
              model,
            });
          } else {
            provider = existingContext.provider;
            model = existingContext.model;
          }
        }

        return reply.code(200).send({
          chatId,
          provider,
          model,
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

      await createChatContext(chatId, userId, projectId, {
        ...chatContext,
        provider: aiConfig.provider,
        model: aiConfig.model,
      });
      const messages = await getChatHistoryWithMergedTools(
        chatId,
        userId,
        projectId,
      );

      return reply.code(200).send({
        chatId,
        provider: aiConfig.provider,
        model: aiConfig.model,
        messages,
      });
    },
  );

  app.post('/', NewMessageOptions, async (request, reply) => {
    const messageContent = await getUserMessage(request.body, reply);
    if (messageContent === null) {
      return; // Error response already sent
    }

    const newMessage: ModelMessage = {
      role: 'user',
      content: messageContent,
    };

    await routeChatRequest({
      app,
      request,
      newMessage,
      reply,
    });
  });

  app.post('/chat-name', ChatNameOptions, async (request, reply) => {
    const chatId = request.body.chatId;
    const userId = request.principal.id;
    const projectId = request.principal.projectId;

    try {
      const { chatHistory } = await getConversation(chatId, userId, projectId);

      if (chatHistory.length === 0) {
        return await reply.code(200).send({ chatName: DEFAULT_CHAT_NAME });
      }

      const rawChatName = await generateChatName(chatHistory, projectId);
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
      const { aiConfig, languageModel } = await getLLMConfig(
        projectId,
        conversationResult?.chatContext?.model,
      );

      const ctx = conversationResult.chatContext;
      if (!ctx.provider || !ctx.model || ctx.provider !== aiConfig.provider) {
        await createChatContext(chatId, userId, projectId, {
          ...ctx,
          provider: aiConfig.provider,
          model: aiConfig.model,
        });
      }

      conversationResult.chatHistory.push({
        role: 'user',
        content: request.body.message,
      });

      const { chatContext, chatHistory } = conversationResult;

      const enrichedContext = request.body.additionalContext
        ? await enrichContext(request.body.additionalContext, projectId, {
            includeCurrentStepOutput: IncludeOptions.ALWAYS,
          })
        : undefined;

      const prompt = await getBlockSystemPrompt(chatContext, enrichedContext);

      const result = streamCode({
        chatHistory,
        languageModel,
        aiConfig,
        systemPrompt: prompt,
        onFinish: async (result) => {
          const assistantMessage: ModelMessage = {
            role: 'assistant',
            content: JSON.stringify(result.object),
          };
          logger.debug('streamCode finished', {
            result,
          });

          await saveChatHistory(chatId, userId, projectId, [
            ...chatHistory,
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

  app.post('/model', UpdateChatModelOptions, async (request, reply) => {
    const userId = request.principal.id;
    const projectId = request.principal.projectId;
    const { chatId, model } = request.body;

    try {
      const context = await getChatContext(chatId, userId, projectId);
      if (!context) {
        throw new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: {
            message: 'No chat session found for the provided chat ID.',
            entityType: 'Chat Session',
            entityId: chatId,
          },
        });
      }
      const { aiConfig } = await getLLMConfig(projectId);

      let provider = context.provider;
      if (!provider) {
        provider = aiConfig.provider;
      }

      const result = await validateAiProviderConfig({ ...aiConfig, model });

      if (!result.valid) {
        throw new ApplicationError({
          code: ErrorCode.VALIDATION,
          params: {
            message: 'The model is not supported',
          },
        });
      }

      await createChatContext(chatId, userId, projectId, {
        ...context,
        provider,
        model,
      });

      return await reply.code(StatusCodes.OK).send({ chatId, provider, model });
    } catch (error) {
      return handleError(error, reply, 'The model is not supported');
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

const UpdateChatModelOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description:
      'Update the language model used for a specific chat context. Returns the updated provider and model.',
    body: UpdateChatModelRequest,
    response: {
      200: UpdateChatModelResponse,
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
      !lastMessage.parts ||
      !Array.isArray(lastMessage.parts) ||
      lastMessage.parts.length === 0
    ) {
      await reply.code(400).send({
        message:
          'Last message must have valid content array with at least one element.',
      });
      return null;
    }

    const firstContentElement = lastMessage.parts[0];
    const lastContentElement = lastMessage.parts[lastMessage.parts.length - 1];
    if (
      !firstContentElement ||
      typeof firstContentElement !== 'object' ||
      (!('text' in firstContentElement) &&
        !lastContentElement?.type.includes('tool-ui'))
    ) {
      await reply.code(400).send({
        message:
          'Last message must have a text content element as the first element.',
      });
      return null;
    }

    return String(firstContentElement.text ?? 'continue');
  } else {
    return body.message;
  }
}
