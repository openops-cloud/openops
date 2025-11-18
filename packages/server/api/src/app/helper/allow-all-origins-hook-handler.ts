import { onSendHookHandler } from 'fastify/types/hooks';

export const allowAllOriginsHookHandler: onSendHookHandler = (
  request,
  reply,
  payload,
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
    return reply.status(204).send();
  }

  done(null, payload);
  return;
};
