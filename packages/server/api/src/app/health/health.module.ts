import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { ALL_PRINCIPAL_TYPES, PUBLIC_ROUTE_POLICY } from '@openops/shared';

export const healthModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(healthController, { prefix: '/v1/health' });
};

const healthController: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/',
    {
      config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,
        security: PUBLIC_ROUTE_POLICY,
      },
    },
    async () => {
      return { status: 'OK' };
    },
  );
};
