import { isNil, openOpsId, Principal, PrincipalType } from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { BaseSecurityHandler } from '../security-handler';

export class AnonymousAuthnHandler extends BaseSecurityHandler {
  protected canHandle(_request: FastifyRequest): Promise<boolean> {
    return Promise.resolve(true);
  }

  protected doHandle(request: FastifyRequest): Promise<void> {
    const principal = request.principal as Principal | undefined;

    if (isNil(principal)) {
      request.principal = {
        id: `ANONYMOUS_${openOpsId()}`,
        type: PrincipalType.UNKNOWN,
        projectId: `ANONYMOUS_${openOpsId()}`,
        organization: {
          id: `ANONYMOUS_${openOpsId()}`,
        },
      };
    }

    return Promise.resolve();
  }
}
