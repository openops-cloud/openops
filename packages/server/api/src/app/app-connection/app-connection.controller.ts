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
import { blockMetadataService } from '../blocks/block-metadata-service';
import { sendConnectionDeletedEvent } from '../telemetry/event-models';
import { appConnectionService } from './app-connection-service/app-connection-service';
import { redactSecrets, removeSensitiveData } from './app-connection-utils';

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
      const { name, blockNames, status, cursor, limit } = request.query;

      const appConnections = await appConnectionService.list({
        blockNames,
        name,
        status,
        projectId: request.principal.projectId,
        cursorRequest: cursor ?? null,
        limit: limit ?? DEFAULT_PAGE_SIZE,
      });

      const appConnectionsWithoutSensitiveData: SeekPage<AppConnectionWithoutSensitiveData> =
        {
          ...appConnections,
          data: appConnections.data.map(removeSensitiveData),
        };

      return appConnectionsWithoutSensitiveData;
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
    description: 'Upsert an app connection based on the app name',
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
    description: 'Update an app connection based on the connection ID',
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
    description: 'List app connections',
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
    description: 'Delete an app connection',
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
    description: 'Get an app connection',
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
