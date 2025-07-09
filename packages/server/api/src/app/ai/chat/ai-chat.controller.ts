import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { getAiProviderLanguageModel } from '@openops/common';
import { encryptUtils, logger } from '@openops/server-shared';
import {
  DeleteChatHistoryRequest,
  NewMessageRequest,
  OpenChatRequest,
  OpenChatResponse,
  PrincipalType,
} from '@openops/shared';
import {
  CoreAssistantMessage,
  CoreToolMessage,
  pipeDataStreamToResponse,
  streamText,
  TextPart,
} from 'ai';
import { StatusCodes } from 'http-status-codes';
import {
  sendAiChatFailureEvent,
  sendAiChatMessageSendEvent,
} from '../../telemetry/event-models/ai';
import { aiConfigService } from '../config/ai-config.service';
import {
  ChatContext,
  createChatContext,
  deleteChatHistory,
  generateChatId,
  getChatContext,
  getChatHistory,
  saveChatHistory,
} from './ai-chat.service';
import { getSystemPrompt } from './prompts.service';

export const aiChatController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/open',
    OpenChatOptions,
    async (request, reply): Promise<OpenChatResponse> => {
      const chatContext: ChatContext = {
        workflowId: request.body.workflowId,
        blockName: request.body.blockName,
        stepName: request.body.stepName,
        actionName: request.body.actionName,
      };

      const chatId = generateChatId({
        ...chatContext,
        userId: request.principal.id,
      });

      const messages = await getChatHistory(chatId);

      if (messages.length === 0) {
        await createChatContext(chatId, chatContext);
      }

      return reply.code(200).send({
        chatId,
        messages,
      });
    },
  );

  app.post('/conversation', NewMessageOptions, async (request, reply) => {
    const chatId = request.body.chatId;
    const projectId = request.principal.projectId;
    const chatContext = await getChatContext(chatId);
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

    const messages = await getChatHistory(chatId);
    messages.push({
      role: 'user',
      content: request.body.message,
    });

    pipeDataStreamToResponse(reply.raw, {
      execute: async (dataStreamWriter) => {
        const result = streamText({
          model: languageModel,
          system: await getSystemPrompt(chatContext),
          messages,
          ...aiConfig.modelSettings,
          async onFinish({ response }) {
            response.messages.forEach((r) => {
              messages.push(getResponseObject(r));
            });

            await saveChatHistory(chatId, messages);
          },
        });

        result.mergeIntoDataStream(dataStreamWriter);
        sendAiChatMessageSendEvent({
          projectId,
          userId: request.principal.id,
          chatId,
          provider: aiConfig.provider,
        });
      },
      onError: (error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        sendAiChatFailureEvent({
          projectId,
          userId: request.principal.id,
          chatId,
          errorMessage,
          provider: aiConfig.provider,
          model: aiConfig.model,
        });

        return errorMessage;
      },
    });
  });

  app.delete(
    '/conversation/:chatId',
    DeleteChatOptions,
    async (request, reply) => {
      const { chatId } = request.params;

      try {
        await deleteChatHistory(chatId);
        return await reply.code(StatusCodes.OK).send();
      } catch (error) {
        logger.error('Failed to delete chat history with error: ', { error });
        return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
          message: 'Failed to delete chat history',
        });
      }
    },
  );
};

const OpenChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description:
      'Initialize a new chat session or resume an existing one. This endpoint creates a unique chat ID and context for the conversation, storing the workflow, block, step, and action information for future reference.',
    body: OpenChatRequest,
  },
};

const NewMessageOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description:
      'Send a message to the AI chat session and receive a streaming response. This endpoint processes the user message, generates an AI response using the configured language model, and maintains the conversation history.',
    body: NewMessageRequest,
  },
};

const DeleteChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description:
      'Delete a chat session and its associated history. This endpoint removes all messages and context data for the specified chat ID, effectively ending the conversation.',
    params: DeleteChatHistoryRequest,
  },
};

function getResponseObject(message: CoreAssistantMessage | CoreToolMessage): {
  role: 'assistant';
  content: string | Array<TextPart>;
} {
  if (message.role === 'tool') {
    return {
      role: 'assistant',
      content: 'Messages received with the tool role are not supported.',
    };
  }

  const content = message.content;
  if (typeof content !== 'string' && Array.isArray(content)) {
    for (const part of content) {
      if (part.type !== 'text') {
        return {
          role: 'assistant',
          content: `Invalid message type received. Type: ${part.type}`,
        };
      }
    }

    return {
      role: 'assistant',
      content: content as TextPart[],
    };
  }

  return {
    role: 'assistant',
    content,
  };
}
