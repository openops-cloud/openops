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
  private static readonly HEADER_NAME = 'authorization';
  private static readonly HEADER_PREFIX = 'Bearer ';

  protected canHandle(request: FastifyRequest): Promise<boolean> {
    const hasToken = this.getAccessToken(request) !== undefined;
    const skipAuth = request.routeOptions.config?.skipAuth ?? false;
    return Promise.resolve(hasToken && !skipAuth);
  }

  private getAccessToken(request: FastifyRequest): string | undefined {
    const cookieToken = request.cookies?.[AccessTokenAuthnHandler.COOKIE_NAME];
    if (!isNil(cookieToken)) {
      return cookieToken;
    }

    const header = request.headers[AccessTokenAuthnHandler.HEADER_NAME];
    if (header?.startsWith(AccessTokenAuthnHandler.HEADER_PREFIX)) {
      return header.substring(AccessTokenAuthnHandler.HEADER_PREFIX.length);
    }

    return undefined;
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
    const accessToken = this.getAccessToken(request);

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
