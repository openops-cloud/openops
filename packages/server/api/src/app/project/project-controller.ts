import {
  FastifyPluginCallbackTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  ApplicationError,
  ErrorCode,
  Project,
  SeekPage,
} from '@openops/shared';
import { paginationHelper } from '../helper/pagination/pagination-utils';
import { projectService } from './project-service';

export const userProjectController: FastifyPluginCallbackTypebox = (
  fastify,
  _opts,
  done,
) => {
  fastify.get(
    '/:id',
    GetUserProjectRequestOptions,
    async (request, response) => {
      try {
        return await projectService.getOneOrThrow(request.principal.projectId);
      } catch (err) {
        if (err instanceof ApplicationError) {
          err.error.code = ErrorCode.ENTITY_NOT_FOUND;
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
  schema: {
    response: {
      200: ProjectWithoutToken,
    },
  },
};

const ListUserProjectsRequestOptions = {
  schema: {
    response: {
      200: SeekPage(ProjectWithoutToken),
    },
  },
};
