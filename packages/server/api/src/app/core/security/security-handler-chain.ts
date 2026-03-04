import { Principal } from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { AccessTokenAuthnHandler } from './authn/access-token-authn-handler';
import { AnonymousAuthnHandler } from './authn/anonymous-authn-handler';
import { getAuthorizationHandler } from './authz/authorization-handler-factory';

const AUTHN_HANDLERS = [
  new AccessTokenAuthnHandler(),
  new AnonymousAuthnHandler(),
];

export const securityHandlerChain = async (
  request: FastifyRequest,
): Promise<void> => {
  await executeAuthnHandlers(request);
  await getAuthorizationHandler().validate(request);
};

/**
 * Executes authn handlers in order, if one of the handlers populates the principal,
 * the remaining handlers are skipped.
 */
const executeAuthnHandlers = async (request: FastifyRequest): Promise<void> => {
  for (const handler of AUTHN_HANDLERS) {
    await handler.handle(request);
    const principalPopulated = checkWhetherPrincipalIsPopulated(request);
    if (principalPopulated) {
      return;
    }
  }
};

const checkWhetherPrincipalIsPopulated = (request: FastifyRequest): boolean => {
  const principal = request.principal as Principal | undefined;
  return principal !== undefined;
};
