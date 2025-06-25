import { AppSystemProp, system } from '@openops/server-shared';
import {
  ApplicationError,
  ErrorCode,
  isNil,
  openOpsId,
  PrincipalType,
} from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { BaseSecurityHandler } from '../security-handler';

export class GlobalApiKeyAuthnHandler extends BaseSecurityHandler {
  private static readonly HEADER_NAME = 'api-key';
  private static readonly API_KEY = system.get(AppSystemProp.API_KEY);

  protected canHandle(request: FastifyRequest): Promise<boolean> {
    const routeMatches =
      request.headers[GlobalApiKeyAuthnHandler.HEADER_NAME] !== undefined;
    const skipAuth = request.routeOptions.config?.skipAuth ?? false;
    return Promise.resolve(routeMatches && !skipAuth);
  }

  protected doHandle(request: FastifyRequest): Promise<void> {
    const requestApiKey = request.headers[GlobalApiKeyAuthnHandler.HEADER_NAME];
    const keyNotMatching = requestApiKey !== GlobalApiKeyAuthnHandler.API_KEY;

    if (keyNotMatching || isNil(GlobalApiKeyAuthnHandler.API_KEY)) {
      throw new ApplicationError({
        code: ErrorCode.INVALID_API_KEY,
        params: {},
      });
    }

    request.principal = {
      id: `SUPER_USER_${openOpsId()}`,
      type: PrincipalType.SUPER_USER,
      projectId: `SUPER_USER_${openOpsId()}`,
      organization: {
        id: `SUPER_USER_${openOpsId()}`,
      },
    };

    return Promise.resolve();
  }
}
