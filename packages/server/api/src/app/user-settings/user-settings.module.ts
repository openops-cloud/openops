import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  isEmpty,
  PrincipalType,
  SERVICE_KEY_SECURITY_OPENAPI,
  UserSettingsDefinition,
} from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { getProjectScopedRoutePolicy } from '../core/security/route-policies/route-security-policy-factory';
import { userSettingsService } from './user-settings-service';

export const userSettingsModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(usersSettingsController, {
    prefix: '/v1/users/me/settings',
  });
};

const usersSettingsController: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/', GetUserSettingsRequestOptions, async (request, response) => {
    const userSettings = await userSettingsService.get({
      userId: request.principal.id,
      projectId: request.principal.projectId,
      organizationId: request.principal.organization.id,
    });

    if (!userSettings) {
      return response.status(StatusCodes.NOT_FOUND);
    }

    return userSettings.settings;
  });
  app.put(
    '/',
    UpsertUserSettingsRequestOptions,
    async (
      request: FastifyRequest<{ Body: UserSettingsDefinition }>,
      response,
    ) => {
      const settings = request.body;
      if (isEmpty(settings)) {
        return response.status(StatusCodes.BAD_REQUEST).send({
          message: 'settings is required',
        });
      }

      const { settings: newSettings } = await userSettingsService.upsert({
        userId: request.principal.id,
        projectId: request.principal.projectId,
        organizationId: request.principal.organization.id,
        settings,
      });
      return newSettings;
    },
  );
};

const GetUserSettingsRequestOptions = {
  config: {
    security: getProjectScopedRoutePolicy({
      allowedPrincipals: [PrincipalType.USER],
    }),
  },
  schema: {
    tags: ['user'],
    description: 'Get user settings',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    response: {
      [StatusCodes.OK]: UserSettingsDefinition,
      [StatusCodes.NOT_FOUND]: Type.Null(),
    },
  },
};

const UpsertUserSettingsRequestOptions = {
  config: {
    security: getProjectScopedRoutePolicy({
      allowedPrincipals: [PrincipalType.USER],
    }),
  },
  schema: {
    tags: ['user'],
    description: 'Upsert user settings',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    body: UserSettingsDefinition,
    response: {
      [StatusCodes.OK]: UserSettingsDefinition,
      [StatusCodes.BAD_REQUEST]: Type.Object({
        message: Type.String(),
      }),
    },
  },
};
