import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { PUBLIC_ROUTE_POLICY } from '@openops/shared';

export const healthModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(healthController, { prefix: '/v1/health' });
};

const healthController: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/',
    {
      config: {
        security: PUBLIC_ROUTE_POLICY,
      },
    },
    async () => {
      return { status: 'OK' };
    },
  );
};
