/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FastifyPluginCallbackTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { system } from '@openops/server-shared';
import {
  AppConnectionWithoutSensitiveData,
  FlagId,
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
import { blockMetadataService } from '../blocks/block-metadata-service';
import { devFlagsService } from '../flags/dev-flags.service';
import { flagService } from '../flags/flag.service';
import { sendConnectionDeletedEvent } from '../telemetry/event-models';
import { appConnectionService } from './app-connection-service/app-connection-service';
import { redactSecrets, removeSensitiveData } from './app-connection-utils';
import {
  getProviderMetadataForAllBlocks,
  resolveProvidersForBlocks,
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
    const block = await blockMetadataService.getOrThrow({
      name: request.body.blockName,
      projectId: request.principal.projectId,
      version: undefined,
    });

    const appConnection = await appConnectionService.patch({
      userId: request.principal.id,
      projectId: request.principal.projectId,
      request: request.body,
      block,
    });

    const redactedValue = redactSecrets(block.auth, appConnection.value);

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
      const { name, status, cursor, limit } = request.query;
      let { blockNames, providers } = request.query;

      const featureFlag = await devFlagsService.getOne(
        FlagId.USE_CONNECTIONS_PROVIDER,
      );
      if (blockNames && featureFlag?.value) {
        const blockProviders = await resolveProvidersForBlocks(
          blockNames,
          request.principal.projectId,
        );

        blockNames = [];
        providers = providers ?? [];
        providers.push(...blockProviders);
      }

      const appConnections = await appConnectionService.list({
        // TODO: remove blockNames from this request
        blockNames,
        name,
        status,
        projectId: request.principal.projectId,
        cursorRequest: cursor ?? null,
        limit: limit ?? DEFAULT_PAGE_SIZE,
        providers,
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
      const connection = await appConnectionService.getOneOrThrow({
        id: request.params.id,
        projectId: request.principal.projectId,
      });

      const block = await blockMetadataService.get({
        name: connection.blockName,
        projectId: request.principal.projectId,
        version: undefined,
      });

      if (!block) {
        return reply.status(StatusCodes.BAD_REQUEST);
      }

      const redactedValue = redactSecrets(block.auth, connection.value);

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
        connection.blockName,
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
      'Create or update an app connection based on the app name. This endpoint handles both new connection creation and updates to existing connections, supporting various authentication types including OAuth2, Basic Auth, and Custom Auth.',
    body: UpsertAppConnectionRequestBody,
    Response: {
      [StatusCodes.CREATED]: AppConnectionWithoutSensitiveData,
    },
  },
};

const PatchAppConnectionRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
    permission: Permission.WRITE_APP_CONNECTION,
  },
  schema: {
    tags: ['app-connections'],
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    description:
      "Update an existing app connection based on the connection ID. This endpoint allows modification of connection settings, authentication details, and other configuration parameters while maintaining the connection's identity.",
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
    tags: ['app-connections'],
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    querystring: ListAppConnectionsRequestQuery,
    description:
      'List all app connections in the project with filtering and pagination options. This endpoint supports filtering by name, block type, and status, and includes pagination controls for large result sets.',
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
    allowedPrincipals: [PrincipalType.USER],
    permission: Permission.READ_APP_CONNECTION,
  },
  schema: {
    tags: ['app-connections'],
    description:
      'Get an app connection by its ID. This endpoint retrieves detailed information about a specific app connection, including its configuration, settings, and current status. Sensitive data such as authentication tokens and secrets is automatically redacted in the response for security.',
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
    },
  },
};

const GetConnectionMetadataRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
    permission: Permission.READ_APP_CONNECTION,
  },
  schema: {
    tags: ['app-connections'],
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    description: 'Get authentication metadata for all available connections',
    response: {
      [StatusCodes.OK]: Type.Record(Type.String(), Type.Unknown()),
    },
  },
};
