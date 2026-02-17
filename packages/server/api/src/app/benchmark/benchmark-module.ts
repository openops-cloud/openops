import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { benchmarkController } from './benchmark.controller';

export const benchmarkModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(benchmarkController, { prefix: '/v1/benchmarks' });
};
