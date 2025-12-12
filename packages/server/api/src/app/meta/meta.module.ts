import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { SharedSystemProp, system } from '@openops/server-shared';
import {
  ALL_PRINCIPAL_TYPES,
  PLATFORM_METADATA_PLACEHOLDER,
  PlatformMetadata,
} from '@openops/shared';

export const metaModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(metaController, { prefix: '/v1/meta' });
};

const metaController: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/',
    {
      schema: {
        response: {
          200: PlatformMetadata,
        },
      },
      config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,
      },
    },
    async (): Promise<PlatformMetadata> => {
      return {
        version:
          system.get(SharedSystemProp.VERSION) ??
          PLATFORM_METADATA_PLACEHOLDER.app,
        tablesVersion:
          system.get(SharedSystemProp.OPENOPS_TABLES_VERSION) ??
          PLATFORM_METADATA_PLACEHOLDER.tables,
        analyticsVersion:
          system.get(SharedSystemProp.ANALYTICS_VERSION) ??
          PLATFORM_METADATA_PLACEHOLDER.analytics,
        environment:
          system.get(SharedSystemProp.ENVIRONMENT_NAME) ??
          PLATFORM_METADATA_PLACEHOLDER.environment,
      };
    },
  );
};
