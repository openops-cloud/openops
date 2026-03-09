import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { ALL_PRINCIPAL_TYPES, PUBLIC_ROUTE_POLICY } from '@openops/shared';
import {
  allowAllOriginsHookHandler,
  registerOptionsEndpoint,
} from '../helper/allow-all-origins-hook-handler';
import { verifyUserWithPublicKeys } from './cloud-auth';

export const userInfoModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(userInfoController, { prefix: '/v1/user-info' });
};

export const userInfoController: FastifyPluginAsyncTypebox = async (app) => {
  const publicKey = system.get(AppSystemProp.FRONTEGG_PUBLIC_KEY);
  const connectionPageEnabled = system.getBoolean(
    AppSystemProp.CLOUD_CONNECTION_PAGE_ENABLED,
  );

  if (!publicKey || !connectionPageEnabled) {
    logger.info(
      'Missing Frontegg configuration, disabling cloud templates API',
    );
    return;
  }

  const oldPublicKey = system.get(AppSystemProp.OLD_FRONTEGG_PUBLIC_KEY);
  const publicKeys = [publicKey, oldPublicKey].filter((key): key is string =>
    Boolean(key),
  );

  // user-info is available on any origin
  app.addHook('onRequest', allowAllOriginsHookHandler);
  registerOptionsEndpoint(app);

  app.get(
    '/',
    {
      config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,
        security: PUBLIC_ROUTE_POLICY,
      },
    },
    async (request, reply) => {
      const user = verifyUserWithPublicKeys(request, publicKeys);

      if (!user) {
        return reply.status(401).send();
      }

      return user;
    },
  );
};
