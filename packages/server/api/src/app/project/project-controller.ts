import {
  FastifyPluginCallbackTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  ApplicationError,
  PrincipalType,
  ProjectWithoutSensitiveData,
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

const GetUserProjectRequestOptions = {
  config: {
    security: getProjectScopedRoutePolicy({
      allowedPrincipals: [PrincipalType.USER],
    }),
  },
  schema: {
    response: {
      200: ProjectWithoutSensitiveData,
      401: Type.Null(),
      404: Type.Null(),
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
      200: SeekPage(ProjectWithoutSensitiveData),
    },
  },
};
