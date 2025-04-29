import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { getAiProviderLanguageModel } from '@openops/common';
import { logger } from '@openops/server-shared';
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
import { encryptUtils } from '../../helper/encryption';
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
      },
      onError: (error) => {
        return error instanceof Error ? error.message : String(error);
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
        logger.error('Failed to delete chat history with error: ', error);
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
      'Opens a chat session, either starting fresh or resuming prior messages if the conversation has history.',
    body: OpenChatRequest,
  },
};

const NewMessageOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description: 'Sends a message to the chat session',
    body: NewMessageRequest,
  },
};

const DeleteChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description: 'Deletes a chat history chat ID.',
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
