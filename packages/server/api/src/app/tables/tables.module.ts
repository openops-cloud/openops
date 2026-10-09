import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { tablesController } from './tables.controller';

export const tablesModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(tablesController, { prefix: '/v1/tables' });
};
