import { logger } from '@openops/server-shared';
import {
  ApplicationError,
  ErrorCode,
  isNil,
  PrincipalType,
} from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { accessTokenManager } from '../../../authentication/context/access-token-manager';
import { userService } from '../../../user/user-service';
import { BaseSecurityHandler } from '../security-handler';

export class AccessTokenAuthnHandler extends BaseSecurityHandler {
  private static readonly COOKIE_NAME = 'token';

  protected canHandle(request: FastifyRequest): Promise<boolean> {
    const token = request.cookies?.[AccessTokenAuthnHandler.COOKIE_NAME];
    const hasToken = !isNil(token);
    const skipAuth = request.routeOptions.config?.skipAuth ?? false;
    return Promise.resolve(hasToken && !skipAuth);
  }

  protected async doHandle(request: FastifyRequest): Promise<void> {
    try {
      const accessToken = this.extractAccessTokenOrThrow(request);
      const principal = await accessTokenManager.extractPrincipal(accessToken);
      request.principal = principal;

      if (request.principal && request.principal.type === PrincipalType.USER) {
        const userId = request.principal.id;
        request.requestContext.set('userId' as never, userId as never);

        const trackEvents = await userService.getTrackEventsConfig(userId);
        request.requestContext.set(
          'trackEvents' as never,
          trackEvents as never,
        );
      }
    } catch (error) {
      logger.debug('Failed to extract principal from access token', {
        method: request.method,
        url: request.url,
        body: request.body,
      });

      throw error;
    }
  }

  private extractAccessTokenOrThrow(request: FastifyRequest): string {
    const accessToken = request.cookies?.[AccessTokenAuthnHandler.COOKIE_NAME];

    if (isNil(accessToken)) {
      throw new ApplicationError({
        code: ErrorCode.AUTHENTICATION,
        params: {
          message: 'missing access token',
        },
      });
    }

    return accessToken;
  }
}
