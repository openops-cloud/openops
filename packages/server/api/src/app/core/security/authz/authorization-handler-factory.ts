import { FastifyRequest } from 'fastify';
import { simpleAuthorizationHandler } from './simple-authorization-handler';

export type AuthorizationHandler = {
  execute(request: FastifyRequest): Promise<void>;
};

export function getAuthorizationHandler(): AuthorizationHandler {
  return simpleAuthorizationHandler;
}
