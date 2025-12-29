import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { PrincipalType, RefreshToken } from '@openops/shared';
import { refreshTokenService } from './refresh-token.service';

export const refreshTokenController: FastifyPluginAsyncTypebox = async (
  app,
) => {
  app.post('/', CreateRefreshTokenRequest, async (request) => {
    return refreshTokenService.save({
      principal: request.principal,
      client: request.body.client,
      userToken: request.headers.authorization!.split(' ')[1],
    });
  });
};

const CreateRefreshTokenRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    description: 'Create a new refresh token',
    body: Type.Object({
      client: Type.String(),
    }),
    response: {
      200: RefreshToken,
    },
  },
};
