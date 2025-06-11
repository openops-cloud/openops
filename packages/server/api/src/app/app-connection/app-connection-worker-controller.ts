import {
  FastifyPluginCallbackTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  AppConnection,
  ApplicationError,
  ErrorCode,
  isNil,
} from '@openops/shared';
import { allowWorkersOnly } from '../authentication/authorization';
import { appConnectionService } from './app-connection-service/app-connection-service';

export const appConnectionWorkerController: FastifyPluginCallbackTypebox = (
  app,
  _opts,
  done,
) => {
  app.addHook('preHandler', allowWorkersOnly);

  app.get(
    '/:connectionName',
    GetAppConnectionRequest,
    async (request): Promise<AppConnection> => {
      const appConnection = await appConnectionService.getOne({
        projectId: request.principal.projectId,
        name: request.params.connectionName,
      });

      if (isNil(appConnection)) {
        throw new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: {
            entityId: `connectionName=${request.params.connectionName}`,
            entityType: 'AppConnection',
          },
        });
      }

      return appConnection;
    },
  );

  done();
};

const GetAppConnectionRequest = {
  schema: {
    params: Type.Object({
      connectionName: Type.String(),
    }),
    description:
      'Get an app connection by its name. This endpoint is specifically for worker processes to retrieve app connection details by name, with proper error handling for non-existent connections.',
  },
};
