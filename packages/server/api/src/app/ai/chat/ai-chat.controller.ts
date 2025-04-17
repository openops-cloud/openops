import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  OpenChatRequest,
  OpenChatResponse,
  PrincipalType,
} from '@openops/shared';
import {
  ChatContext,
  createChatContext,
  generateChatId,
  getChatHistory,
} from './ai-chat.service';

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
