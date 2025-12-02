import { logger } from '@openops/server-shared';
import { onRequestHookHandler } from 'fastify';

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
    'Content-Type,Ops-Origin,Authorization',
  );

  void reply.header('Access-Control-Allow-Credentials', 'true');

  if (request.method === 'OPTIONS') {
    logger.info('Returning 204 No Content for CORS preflight request.');
    return void reply.status(204).send();
  }

  done();
};
