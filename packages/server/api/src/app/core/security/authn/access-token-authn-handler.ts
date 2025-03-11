import { cacheWrapper, logger } from '@openops/server-shared';
import {
  ApplicationError,
  ErrorCode,
  isNil,
  PrincipalType,
} from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { accessTokenManager } from '../../../authentication/lib/access-token-manager';
import { userService } from '../../../user/user-service';
import { BaseSecurityHandler } from '../security-handler';

export class AccessTokenAuthnHandler extends BaseSecurityHandler {
  private static readonly HEADER_NAME = 'authorization';
  private static readonly HEADER_PREFIX = 'Bearer ';

  protected canHandle(request: FastifyRequest): Promise<boolean> {
    const header = request.headers[AccessTokenAuthnHandler.HEADER_NAME];
    const prefix = AccessTokenAuthnHandler.HEADER_PREFIX;
    const routeMatches = header?.startsWith(prefix) ?? false;
    const skipAuth = request.routeConfig.skipAuth;
    return Promise.resolve(routeMatches && !skipAuth);
  }

  protected async doHandle(request: FastifyRequest): Promise<void> {
    try {
      const accessToken = this.extractAccessTokenOrThrow(request);
      const principal = await accessTokenManager.extractPrincipal(accessToken);
      request.principal = principal;

      if (request.principal && request.principal.type === PrincipalType.USER) {
        const userId = request.principal.id;
        request.requestContext.set('userId' as never, userId as never);

        const trackEvents = await getTrackEventsConfigForUser(userId);
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
    const header = request.headers[AccessTokenAuthnHandler.HEADER_NAME];
    const prefix = AccessTokenAuthnHandler.HEADER_PREFIX;
    const accessToken = header?.substring(prefix.length);

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

async function getTrackEventsConfigForUser(userId: string): Promise<string> {
  const trackEventsKey = `track-events-${userId}`;

  let trackEvents = await cacheWrapper.getKey(trackEventsKey);
  if (trackEvents) {
    return trackEvents;
  }

  const user = await userService.get({ id: userId });
  if (!user) {
    return 'false';
  }

  trackEvents = user.trackEvents?.toString() ?? 'false';
  await cacheWrapper.setKey(trackEventsKey, trackEvents);
  return trackEvents;
}
