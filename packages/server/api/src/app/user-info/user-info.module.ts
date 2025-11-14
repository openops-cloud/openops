import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { ALL_PRINCIPAL_TYPES } from '@openops/shared';
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
  app.addHook('onSend', (request, reply, payload, done) => {
    void reply.header(
      'Access-Control-Allow-Origin',
      request.headers.origin || request.headers['Ops-Origin'] || '*',
    );
    void reply.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
    void reply.header(
      'Access-Control-Allow-Headers',
      'Content-Type,Ops-Origin,Authorization',
    );
    void reply.header('Access-Control-Allow-Credentials', 'true');
    if (request.method === 'OPTIONS') {
      return reply.status(204).send();
    }

    done(null, payload);
    return;
  });

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
