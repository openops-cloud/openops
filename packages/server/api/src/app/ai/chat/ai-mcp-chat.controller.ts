import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { getRedisConnection, logger } from '@openops/server-shared';
import {
  ApplicationError,
  ChatNameRequest,
  DeleteChatHistoryRequest,
  ListChatsResponse,
  NewMessageRequest,
  OpenChatMCPRequest,
  OpenChatResponse,
  openOpsId,
  PrincipalType,
} from '@openops/shared';
import {
  convertToModelMessages,
  ModelMessage,
  UI_MESSAGE_STREAM_HEADERS,
  UIMessage,
} from 'ai';
import { FastifyReply } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { createResumableStreamContext } from 'resumable-stream/ioredis';
import {
  createChatContext,
  deleteChatHistory,
  generateChatId,
  generateChatIdForMCP,
  generateChatName,
  getAllChats,
  getChatContext,
  getChatHistory,
  getConversation,
  MCPChatContext,
  updateChatName,
} from './ai-chat.service';
import { routeChatRequest } from './chat-request-router';
import { ChatHistory } from './types';
import { makeWaitUntil } from './utils';

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
          const { messages } = await getChatHistory(
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

        const { messages } = await getChatHistory(chatId, userId, projectId);

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
      const { messages } = await getChatHistory(chatId, userId, projectId);

      return reply.code(200).send({
        chatId,
        messages,
      });
    },
  );

  app.post('/', NewMessageOptions, async (request, reply) => {
    const newMessage = request.body.message as UIMessage;

    return routeChatRequest({
      app,
      request,
      newMessage,
      reply,
    });
  });

  app.get('/:id/stream', GetChatOptions, async (request, reply) => {
    const chatId = request.params.id;
    const userId = request.principal.id;
    const projectId = request.principal.projectId;
    let chatHistory: ChatHistory | undefined;

    try {
      chatHistory = await getChatHistory(chatId, userId, projectId);
    } catch (error) {
      return handleError(error, reply, 'get chat history');
    }

    if (chatHistory?.activeStreamId == null) {
      // no content response when there is no active stream
      return reply.code(204).send();
    }

    const waitUntil = makeWaitUntil(reply);

    const redisConnection = getRedisConnection();
    const subscriberConnection = redisConnection.duplicate();
    const publisherConnection = redisConnection.duplicate();
    const streamContext = createResumableStreamContext({
      waitUntil,
      subscriber: subscriberConnection,
      publisher: publisherConnection,
    });

    const stream = await streamContext.resumeExistingStream(
      chatHistory.activeStreamId,
    );
    return reply.code(200).headers(UI_MESSAGE_STREAM_HEADERS).send(stream);
  });

  app.post('/chat-name', ChatNameOptions, async (request, reply) => {
    const chatId = request.body.chatId;
    const userId = request.principal.id;
    const projectId = request.principal.projectId;

    try {
      const { chatHistory } = await getConversation(chatId, userId, projectId);

      if (chatHistory.messages.length === 0) {
        return await reply.code(200).send({ chatName: DEFAULT_CHAT_NAME });
      }

      const rawChatName = await generateChatName(
        convertToModelMessages(chatHistory.messages),
        projectId,
      );
      const chatName = rawChatName.trim() || DEFAULT_CHAT_NAME;

      await updateChatName(chatId, userId, projectId, chatName);

      return await reply.code(200).send({ chatName });
    } catch (error) {
      return handleError(error, reply, 'generate chat name');
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

const GetChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description: 'Get a chat stream by chat ID.',
    params: Type.Object({
      id: Type.String(),
    }),
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
