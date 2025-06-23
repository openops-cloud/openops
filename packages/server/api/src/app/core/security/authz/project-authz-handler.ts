import { ApplicationError, ErrorCode, PrincipalType } from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { requestUtils } from '../../request/request-utils';
import { BaseSecurityHandler } from '../security-handler';

export class ProjectAuthzHandler extends BaseSecurityHandler {
  private static readonly IGNORED_ROUTES = [
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
  ];

  protected canHandle(request: FastifyRequest): Promise<boolean> {
    const routerPath = request.routeOptions?.url ?? '';

    const requestMatches =
      !ProjectAuthzHandler.IGNORED_ROUTES.includes(routerPath);

    return Promise.resolve(requestMatches);
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
