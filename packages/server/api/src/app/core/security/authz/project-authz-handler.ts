import { ApplicationError, ErrorCode, PrincipalType } from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { match } from 'path-to-regexp';
import { requestUtils } from '../../request/request-utils';
import { BaseSecurityHandler } from '../security-handler';

export class ProjectAuthzHandler extends BaseSecurityHandler {
  private static readonly IGNORED_ROUTE_PATTERNS = [
    '/v1/admin/blocks',
    '/v1/admin/platforms',
    '/v1/app-credentials',
    '/v1/users/projects/:projectId/token',
    '/v1/webhooks',
    '/v1/webhooks/:flowId',
    '/v1/webhooks/:flowId/test',
    '/v1/webhooks/:flowId/sync',
    // This works for both platform and project, we have to check this manually
    '/v1/user-invitations',
  ].map((pattern) => match(pattern, { decode: decodeURIComponent, end: true }));

  protected canHandle(request: FastifyRequest): Promise<boolean> {
    // const requestMatches = !ProjectAuthzHandler.IGNORED_ROUTES.includes(
    //   request.routerPath,
    // );
    // return Promise.resolve(requestMatches);

    const path = request.routeOptions?.url ?? '';

    const isIgnored = ProjectAuthzHandler.IGNORED_ROUTE_PATTERNS.some(
      (matcher) => matcher(path),
    );

    return Promise.resolve(!isIgnored);
  }

  protected doHandle(request: FastifyRequest): Promise<void> {
    if (request.principal.type === PrincipalType.WORKER) {
      return Promise.resolve();
    }
    const projectId = requestUtils.extractProjectId(request);

    if (projectId && projectId !== request.principal.projectId) {
      throw new ApplicationError({
        code: ErrorCode.AUTHORIZATION,
        params: {
          message: 'invalid project id',
        },
      });
    }

    return Promise.resolve();
  }
}
