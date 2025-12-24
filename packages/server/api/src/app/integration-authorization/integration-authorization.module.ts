import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { integrationAuthorizationController } from './integration-authorization.controller';

export const integrationAuthorizationModule: FastifyPluginAsyncTypebox = async (
  app,
) => {
  await app.register(integrationAuthorizationController, {
    prefix: '/v1/integration-authorization',
  });
};
