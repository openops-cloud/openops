import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { entitiesMustBeOwnedByCurrentProject } from '../authentication/authorization';
import { benchmarkController } from './benchmark.controller';

export const benchmarkModule: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject);

  await app.register(benchmarkController, { prefix: '/v1/benchmarks' });
};
