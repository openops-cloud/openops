import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { aiChatController } from './chat/ai-chat.controller';
import { aiMCPChatController } from './chat/ai-mcp-chat.controller';
import { aiConfigController } from './config/ai-config.controller';
import { aiProvidersController } from './providers/ai-providers.controller';

export const aiModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(aiProvidersController, {
    prefix: '/v1/ai/providers',
  });

  await app.register(aiConfigController, {
    prefix: '/v1/ai/config',
  });

  await app.register(aiChatController, {
    prefix: '/v1/ai/chat',
  });

  await app.register(aiMCPChatController, {
    prefix: '/v1/ai/conversation',
  });
};
