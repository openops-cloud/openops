import { ALL_PRINCIPAL_TYPES } from '@openops/shared';
import { FastifyInstance, onRequestHookHandler } from 'fastify';

export const allowAllOriginsHookHandler: onRequestHookHandler = (
  request,
  reply,
  done,
) => {
  void reply.header(
    'Access-Control-Allow-Origin',
    request.headers.origin || request.headers['Ops-Origin'] || '*',
  );

  void reply.header('Access-Control-Allow-Methods', 'GET,OPTIONS');

  void reply.header(
    'Access-Control-Allow-Headers',
    'Content-Type,Ops-Origin,Authorization,Cloud-Token',
  );

  void reply.header('Access-Control-Allow-Credentials', 'true');

  done();
};

export function registerOptionsEndpoint(app: FastifyInstance) {
  app.options(
    '*',
    {
      config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,
      },
    },
    (_request, reply) => {
      return reply.status(204).send();
    },
  );
}
