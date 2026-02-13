/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FastifyPluginCallbackTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  AppConnectionWithoutSensitiveData,
  ListAppConnectionsRequestQuery,
  OpenOpsId,
  PatchAppConnectionRequestBody,
  Permission,
  PrincipalType,
  SeekPage,
  SERVICE_KEY_SECURITY_OPENAPI,
  UpsertAppConnectionRequestBody,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { sendConnectionDeletedEvent } from '../telemetry/event-models';
import { appConnectionService } from './app-connection-service/app-connection-service';
import { redactSecrets, removeSensitiveData } from './app-connection-utils';
import {
  getAuthProviderMetadata,
  getProviderMetadataForAllBlocks,
} from './connection-providers-resolver';

export const appConnectionController: FastifyPluginCallbackTypebox = (
  app,
  _opts,
  done,
) => {
  app.post('/', UpsertAppConnectionRequest, async (request, reply) => {
    const appConnection = await appConnectionService.upsert({
      userId: request.principal.id,
      projectId: request.principal.projectId,
      request: request.body,
    });

    await reply
      .status(StatusCodes.CREATED)
      .send(removeSensitiveData(appConnection));
  });

  app.patch('/', PatchAppConnectionRequest, async (request, reply) => {
    const authProperty = await getAuthProviderMetadata(
      request.body.authProviderKey,
      request.principal.projectId,
    );

    const appConnection = await appConnectionService.patch({
      userId: request.principal.id,
      projectId: request.principal.projectId,
      request: request.body,
      authProperty,
    });

    const redactedValue = redactSecrets(authProperty, appConnection.value);

    const result = redactedValue
      ? {
          ...appConnection,
          value: redactedValue,
        }
      : removeSensitiveData(appConnection);

    await reply.status(StatusCodes.OK).send(result);
  });

  app.get(
    '/',
    ListAppConnectionsRequest,
    async (request): Promise<SeekPage<AppConnectionWithoutSensitiveData>> => {
      const { name, status, cursor, limit, authProviders } = request.query;

      const appConnections = await appConnectionService.list({
        name,
        status,
        projectId: request.principal.projectId,
        cursorRequest: cursor ?? null,
        limit: limit ?? DEFAULT_PAGE_SIZE,
        authProviders,
      });

      return {
        ...appConnections,
        data: appConnections.data.map(removeSensitiveData),
      };
    },
  );
  app.get(
    '/:id',
    GetAppConnectionRequest,
    async (request, reply): Promise<any> => {
      const projectId = request.principal.projectId;
      const connection = await appConnectionService.getOneOrThrow({
        id: request.params.id,
        projectId,
      });

      const authProperty = await getAuthProviderMetadata(
        connection.authProviderKey,
        projectId,
      );

      if (!authProperty) {
        return reply.status(StatusCodes.BAD_REQUEST);
      }

      const redactedValue = redactSecrets(authProperty, connection.value);

      return redactedValue
        ? {
            ...connection,
            value: redactedValue,
          }
        : removeSensitiveData(connection);
    },
  );
  app.delete(
    '/:id',
    DeleteAppConnectionRequest,
    async (request, reply): Promise<void> => {
      const connection = await appConnectionService.getOneOrThrow({
        id: request.params.id,
        projectId: request.principal.projectId,
      });

      await appConnectionService.delete({
        id: request.params.id,
        projectId: request.principal.projectId,
      });

      sendConnectionDeletedEvent(
        request.principal.id,
        connection.projectId,
        connection.authProviderKey,
      );

      await reply.status(StatusCodes.NO_CONTENT).send();
    },
  );

  app.get(
    '/metadata',
    GetConnectionMetadataRequest,
    async (request): Promise<Record<string, any>> => {
      return getProviderMetadataForAllBlocks(request.principal.projectId);
    },
  );

  done();
};

const DEFAULT_PAGE_SIZE = 10;

const UpsertAppConnectionRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    permission: Permission.WRITE_APP_CONNECTION,
  },
  schema: {
    tags: ['app-connections'],
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    description:
      'Create a new app connection. This endpoint is used for initial connection setup and supports various authentication types including OAuth2, Basic Auth, and Custom Auth. The connection is automatically encrypted and stored securely. Returns the created connection with sensitive data redacted.',
    body: UpsertAppConnectionRequestBody,
    Response: {
      [StatusCodes.CREATED]: AppConnectionWithoutSensitiveData,
    },
  },
};

const PatchAppConnectionRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    permission: Permission.WRITE_APP_CONNECTION,
  },
  schema: {
    operationId: 'Update Connection',
    tags: ['app-connections'],
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    description:
      "Update an existing app connection's configuration. This endpoint is used for modifying an existing connection and requires the connection to already exist. All changes are validated and encrypted before storage. The connection's name and type cannot be changed. Returns the updated connection with sensitive data redacted.",
    body: PatchAppConnectionRequestBody,
    Response: {
      [StatusCodes.OK]: AppConnectionWithoutSensitiveData,
    },
  },
};

const ListAppConnectionsRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    permission: Permission.READ_APP_CONNECTION,
  },
  schema: {
    operationId: 'List Connections',
    tags: ['app-connections'],
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    querystring: ListAppConnectionsRequestQuery,
    description:
      'List all app connections in the project with advanced filtering and pagination capabilities. Supports filtering by name, block type, status, and authentication provider. Results are paginated and include metadata about each connection. All sensitive data is automatically redacted in the response.',
    response: {
      [StatusCodes.OK]: SeekPage(AppConnectionWithoutSensitiveData),
    },
  },
};

const DeleteAppConnectionRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    permission: Permission.WRITE_APP_CONNECTION,
  },
  schema: {
    tags: ['app-connections'],
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    description:
      'Delete an app connection by its ID. This endpoint removes a specific app connection from the project, cleans up associated resources, and triggers a connection deleted event for tracking purposes. Use with caution as this action cannot be undone.',
    params: Type.Object({
      id: OpenOpsId,
    }),
    response: {
      [StatusCodes.NO_CONTENT]: Type.Never(),
    },
  },
};

const GetAppConnectionRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    permission: Permission.READ_APP_CONNECTION,
  },
  schema: {
    operationId: 'Get Connection Details',
    tags: ['app-connections'],
    description:
      'Get detailed information about a specific app connection by its ID. This endpoint retrieves the complete connection configuration, settings, and current status. All sensitive data such as authentication tokens, secrets, and credentials is automatically redacted in the response for security. Returns a 404 error if the connection is not found.',
    params: Type.Object({
      id: OpenOpsId,
    }),
    response: {
      [StatusCodes.OK]: Type.Intersect([
        AppConnectionWithoutSensitiveData,
        Type.Object(
          {
            value: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
          },
          { additionalProperties: true },
        ),
      ]),
      [StatusCodes.BAD_REQUEST]: Type.Unknown(),
    },
  },
};

const GetConnectionMetadataRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    permission: Permission.READ_APP_CONNECTION,
  },
  schema: {
    operationId: 'Get Connection Metadata',
    tags: ['app-connections'],
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    description:
      'Retrieve comprehensive metadata about all available connection types and their authentication requirements. This endpoint provides detailed information about supported authentication methods, required fields, and configuration options for each connection type. Useful for building connection configuration interfaces.',
    response: {
      [StatusCodes.OK]: Type.Record(Type.String(), Type.Unknown()),
      [StatusCodes.BAD_REQUEST]: Type.Unknown(),
    },
  },
};
