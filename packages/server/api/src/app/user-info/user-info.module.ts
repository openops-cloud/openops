import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { ALL_PRINCIPAL_TYPES } from '@openops/shared';
import { allowAllOriginsHookHandler } from '../helper/allow-all-origins-hook-handler';
import { getVerifiedUser } from './cloud-auth';

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

  // user-info is available on any origin
  app.addHook('onSend', allowAllOriginsHookHandler);

  app.get(
    '/',
    {
      config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,
      },
    },
    async (request, reply) => {
      const user = getVerifiedUser(request, publicKey);

      if (!user) {
        return reply.status(401).send();
      }

      return user;
    },
  );
};
