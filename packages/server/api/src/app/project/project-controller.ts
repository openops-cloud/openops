import {
  FastifyPluginCallbackTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  ApplicationError,
  EndpointScope,
  ErrorCode,
  PrincipalType,
  Project,
  UpdateProjectRequestInCommunity,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { paginationHelper } from '../helper/pagination/pagination-utils';
import { projectService } from './project-service';

export const userProjectController: FastifyPluginCallbackTypebox = (
  fastify,
  _opts,
  done,
) => {
  fastify.get('/:id', async (request, response) => {
    try {
      return await projectService.getOneOrThrow(request.principal.projectId);
    } catch (err) {
      if (err instanceof ApplicationError) {
        err.error.code = ErrorCode.ENTITY_NOT_FOUND;
        return response.code(401).send();
      }
      throw err;
    }
  });

  fastify.get('/', async (request) => {
    return paginationHelper.createPage(
      [await projectService.getOneOrThrow(request.principal.projectId)],
      null,
    );
  });
  done();
};

export const projectController: FastifyPluginCallbackTypebox = (
  fastify,
  _opts,
  done,
) => {
  fastify.post('/:id', UpdateProjectRequest, async (request) => {
    return projectService.update(request.params.id, request.body);
  });
  done();
};

const UpdateProjectRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    scope: EndpointScope.ORGANIZATION,
  },
  schema: {
    tags: ['projects'],
    params: Type.Object({
      id: Type.String(),
    }),
    response: {
      [StatusCodes.OK]: Project,
    },
    body: UpdateProjectRequestInCommunity,
  },
};
