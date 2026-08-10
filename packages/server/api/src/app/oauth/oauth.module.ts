import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { logger } from '@openops/server-shared';
import { clientsService } from './clients/clients.service';
import { OAuthError } from './common/oauth-errors';
import { validateOAuthConfiguration } from './config/oauth-config-validation';
import { oauthWellKnownController } from './discovery/oauth-well-known.controller';
import { scheduleOAuthCleanupJob } from './oauth-cleanup-job';
import { oauthController } from './oauth.controller';
import { signingKeyService } from './tokens/signing-key.service';

export const oauthModule: FastifyPluginAsyncTypebox = async (app) => {
  validateOAuthConfiguration();

  await signingKeyService.ensureSigningKey();
  await clientsService.ensureResourceServerClient();
  await scheduleOAuthCleanupJob();

  await app.register(
    async (instance) => {
      // OAuth clients branch on the RFC 6749 `error` code, so these routes must not use
      // the application's own error envelope.
      instance.setErrorHandler((error, _request, reply) => {
        if (error instanceof OAuthError) {
          logger.debug('OAuth request rejected', {
            error: error.errorCode,
            description: error.description,
          });

          return reply
            .status(error.statusCode)
            .header('Cache-Control', 'no-store')
            .send(error.toBody());
        }

        throw error;
      });

      await instance.register(oauthController, { prefix: '/v1/oauth' });
      await instance.register(oauthWellKnownController);
    },
    { prefix: '/' },
  );

  logger.info('OAuth authorization server enabled');
};
