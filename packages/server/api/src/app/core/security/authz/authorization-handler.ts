import { FastifyRequest } from 'fastify';

export type AuthorizationHandler = {
  validate(request: FastifyRequest): Promise<void>;
};
