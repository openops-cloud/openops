import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { userProjectController } from './project-controller';
import { projectWorkerController } from './project-worker-controller';

export const projectModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(userProjectController, { prefix: '/v1/users/projects' });
  await app.register(projectWorkerController, { prefix: '/v1/worker/project' });
};
