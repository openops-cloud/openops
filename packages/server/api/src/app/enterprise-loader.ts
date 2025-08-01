import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { logger } from '@openops/server-shared';

export const loadEnterpriseFeatures: FastifyPluginAsyncTypebox = async (
  app,
) => {
  try {
    const enterpriseModuleName = '@openops/enterprise-api';

    const enterpriseModule = await import(enterpriseModuleName);
    if (enterpriseModule?.enterpriseModules) {
      await app.register(enterpriseModule.enterpriseModules);
      logger.info('Enterprise features enabled');
    }
  } catch (error) {
    logger.info('Enterprise features are disabled');
  }
};
