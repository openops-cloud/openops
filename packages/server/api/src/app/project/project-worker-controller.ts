import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { PrincipalType } from '@openops/shared';
import { projectService } from './project-service';

export const projectWorkerController: FastifyPluginAsyncTypebox = async (
  app,
) => {
  app.get('/', GetWorkerProjectRequest, async (req) => {
    const projectId = req.principal.projectId;
    return projectService.getOneOrThrow(projectId);
  });
};

const GetWorkerProjectRequest = {
  config: {
    allowedPrincipals: [PrincipalType.ENGINE],
  },
};
