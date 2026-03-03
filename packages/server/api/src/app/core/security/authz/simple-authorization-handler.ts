import { FastifyRequest } from 'fastify';
import { AuthorizationHandler } from './authorization-handler-factory';
import { PrincipalTypeAuthzHandler } from './principal-type-authz-handler';
import { ProjectAuthzHandler } from './project-authz-handler';

const AUTHZ_HANDLERS = [
  new PrincipalTypeAuthzHandler(),
  new ProjectAuthzHandler(),
];

export const simpleAuthorizationHandler: AuthorizationHandler = {
  async execute(request: FastifyRequest): Promise<void> {
    for (const handler of AUTHZ_HANDLERS) {
      await handler.handle(request);
    }
  },
};
