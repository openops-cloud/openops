import {
  FastifyPluginCallbackTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  AppConnectionWithoutSensitiveData,
  ListAppConnectionsRequestQuery,
  OpenOpsId,
  Permission,
  PrincipalType,
  SeekPage,
  SERVICE_KEY_SECURITY_OPENAPI,
  UpsertAppConnectionRequestBody,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { sendConnectionDeletedEvent } from '../telemetry/event-models';
import { appConnectionService } from './app-connection-service/app-connection-service';
import { removeSensitiveData } from './app-connection-utils';

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
