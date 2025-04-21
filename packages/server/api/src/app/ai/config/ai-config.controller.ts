import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization';

export const aiConfigController: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject);
};
