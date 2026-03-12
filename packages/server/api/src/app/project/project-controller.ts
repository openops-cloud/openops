import {
  FastifyPluginCallbackTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  ApplicationError,
  PrincipalType,
  Project,
  SeekPage,
} from '@openops/shared';
import { getProjectScopedRoutePolicy } from '../core/security/route-policies/route-security-policy-factory';
import { paginationHelper } from '../helper/pagination/pagination-utils';
import { projectService } from './project-service';

export const userProjectController: FastifyPluginCallbackTypebox = (
  fastify,
  _opts,
  done,
) => {
  fastify.get(
    '/current',
    GetUserProjectRequestOptions,
    async (request, response) => {
      try {
        return await projectService.getOneOrThrow(request.principal.projectId);
      } catch (err) {
        if (err instanceof ApplicationError) {
          return response.code(404).send();
        }
        throw err;
      }
    },
  );

  fastify.get(
    '/:id',
    GetUserProjectRequestOptions,
    async (request, response) => {
      try {
        return await projectService.getOneOrThrow(request.principal.projectId);
      } catch (err) {
        if (err instanceof ApplicationError) {
          return response.code(401).send();
        }
        throw err;
      }
    },
  );

  fastify.get('/', ListUserProjectsRequestOptions, async (request) => {
    return paginationHelper.createPage(
      [await projectService.getOneOrThrow(request.principal.projectId)],
      null,
    );
  });
  done();
};

const ProjectWithoutToken = Type.Omit(Project, ['tablesDatabaseToken']);

const GetUserProjectRequestOptions = {
  config: {
    security: getProjectScopedRoutePolicy({
      allowedPrincipals: [PrincipalType.USER],
    }),
  },
  schema: {
    response: {
      200: ProjectWithoutToken,
    },
  },
};

const ListUserProjectsRequestOptions = {
  config: {
    security: getProjectScopedRoutePolicy({
      allowedPrincipals: [PrincipalType.USER],
    }),
  },
  schema: {
    response: {
      200: SeekPage(ProjectWithoutToken),
    },
  },
};
