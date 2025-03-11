import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { cacheWrapper } from '@openops/server-shared';
import { PrincipalType, UpdateTrackingRequestBody } from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { userService } from './user-service';

export const userModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(usersController, { prefix: '/v1/users' });
};

const usersController: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/me', async (request: FastifyRequest) => {
    const user = await userService.getMetaInfo({
      id: request.principal.id,
    });
    return user;
  });

  app.patch(
    '/tracking-events',
    UpdateTrackingRequestOptions,
    async (request, reply) => {
      try {
        await userService.updateTracking({
          id: request.principal.id,
          trackEvents: request.body.trackEvents,
        });
      } catch (error) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: 'User not found.' }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'User tracking has been successfully updated.',
        }),
      };
    },
  );
};

const UpdateTrackingRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    body: UpdateTrackingRequestBody,
  },
};
