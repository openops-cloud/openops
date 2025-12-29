import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  PrincipalType,
  RefreshToken,
  RefreshTokenClient,
} from '@openops/shared';
import { refreshTokenService } from './refresh-token.service';

export const refreshTokenController: FastifyPluginAsyncTypebox = async (
  app,
) => {
  app.post('/', CreateRefreshTokenRequest, async (request) => {
    return refreshTokenService.save({
      userId: request.principal.id,
      projectId: request.principal.projectId,
      organizationId: request.principal.organization.id,
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
      client: Type.Enum(RefreshTokenClient),
    }),
    response: {
      200: RefreshToken,
    },
  },
};
