import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { IntegrationName, PrincipalType } from '@openops/shared';
import { integrationAuthorizationService } from './integration-authorization.service';

export const integrationAuthorizationController: FastifyPluginAsyncTypebox =
  async (app) => {
    app.post('/', ConnectIntegrationRequest, async (request, response) => {
      if (!request.headers.authorization) {
        return response.status(401).send();
      }

      const userToken = request.headers.authorization.split(' ')[1];

      return integrationAuthorizationService.connect({
        principal: request.principal,
        userToken,
        integrationName: request.body.integrationName,
      });
    });

    app.get('/exists', GetIntegrationRequest, async (request) => {
      return integrationAuthorizationService.exists({
        userId: request.principal.id,
        projectId: request.principal.projectId,
        integrationName: request.query.integrationName,
      });
    });
  };

const ConnectIntegrationRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    description: 'Generate a lifetime token for integration authorization',
    body: Type.Object({
      integrationName: Type.Enum(IntegrationName),
    }),
    response: {
      200: Type.Object({
        token: Type.String(),
      }),
    },
  },
};

const GetIntegrationRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    description: 'Check if integration token exists and is not revoked',
    querystring: Type.Object({
      integrationName: Type.Enum(IntegrationName),
    }),
    response: {
      200: Type.Object({
        exists: Type.Boolean(),
      }),
    },
  },
};
