import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { refreshTokenController } from './refresh-token.controller';

export const refreshTokenModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(refreshTokenController, {
    prefix: '/v1/refresh-tokens',
  });
};
