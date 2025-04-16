import { aiDbController } from './ai-db-controller';

export const aiModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(aiDbController, { prefix: '/v1/ai/config' });
  await app.register(projectController, { prefix: '/v1/projects' });
  await app.register(projectWorkerController, { prefix: '/v1/worker/project' });
};
