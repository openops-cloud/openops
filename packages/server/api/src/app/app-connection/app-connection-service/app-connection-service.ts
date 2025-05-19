import { BlockMetadataModel } from '@openops/blocks-framework';
import { distributedLock, exceptionHandler } from '@openops/server-shared';
import {
  AppConnection,
  AppConnectionId,
  AppConnectionStatus,
  AppConnectionType,
  AppConnectionValue,
  AppConnectionWithoutSensitiveData,
  ApplicationError,
  Cursor,
  ErrorCode,
  isNil,
  OAuth2GrantType,
  openOpsId,
  PatchAppConnectionRequestBody,
  ProjectId,
  SeekPage,
  UpsertAppConnectionRequestBody,
  UserId,
} from '@openops/shared';
import dayjs from 'dayjs';
import { FindOperator, ILike, In } from 'typeorm';
import { repoFactory } from '../../core/db/repo-factory';
import { encryptUtils } from '../../helper/encryption';
import { buildPaginator } from '../../helper/pagination/build-paginator';
import { paginationHelper } from '../../helper/pagination/pagination-utils';
import {
  sendConnectionCreatedEvent,
  sendConnectionUpdatedEvent,
} from '../../telemetry/event-models';
import {
  removeSensitiveData,
  restoreRedactedSecrets,
} from '../app-connection-utils';
import {
  AppConnectionEntity,
  AppConnectionSchema,
} from '../app-connection.entity';
import { oauth2Handler } from './oauth2';
import { oauth2Util } from './oauth2/oauth2-util';
import { engineValidateAuth } from './validate-auth';

const repo = repoFactory(AppConnectionEntity);

export const appConnectionService = {
  async upsert(params: UpsertParams): Promise<AppConnection> {
    const { projectId, request } = params;

    const validatedConnectionValue = await validateConnectionValue({
      connection: request,
      projectId,
    });

    const encryptedConnectionValue = encryptUtils.encryptObject({
      ...validatedConnectionValue,
      ...request.value,
    });

    const existingConnection = await repo().findOneBy({
      name: request.name,
      projectId,
    });

    const connection = {
      ...request,
      status: AppConnectionStatus.ACTIVE,
      value: encryptedConnectionValue,
      id: existingConnection?.id ?? openOpsId(),
      projectId,
    };

    await repo().upsert(connection, ['name', 'projectId']);

    const updatedConnection = await repo().findOneByOrFail({
      name: request.name,
      projectId,
    });

    if (existingConnection) {
      sendConnectionUpdatedEvent(params.userId, projectId, request.blockName);
    } else {
      sendConnectionCreatedEvent(params.userId, projectId, request.blockName);
    }

    return decryptConnection(updatedConnection);
  },

  async patch(params: PatchParams): Promise<AppConnection> {
    const { projectId, request } = params;

    const existingConnection = await repo().findOneBy({
      id: request.id,
      projectId,
    });

    if (isNil(existingConnection)) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          entityType: 'AppConnection',
          entityId: request.id,
        },
      });
    }

    const decryptedExisting = decryptConnection(existingConnection);

    const restoredConnectionValue = restoreRedactedSecrets(
      request.value,
      decryptedExisting.value,
      params.block.auth,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    const validatedConnectionValue = await validateConnectionValue({
      connection: {
        ...request,
        value: restoredConnectionValue,
      } as UpsertAppConnectionRequestBody,
      projectId,
    });

    const encryptedConnectionValue = encryptUtils.encryptObject({
      ...validatedConnectionValue,
      ...restoredConnectionValue,
    });

    await repo().update(existingConnection.id, {
      ...request,
      status: AppConnectionStatus.ACTIVE,
      value: encryptedConnectionValue,
      id: existingConnection?.id,
      projectId,
    });

    sendConnectionUpdatedEvent(params.userId, projectId, request.blockName);

    return {
      ...existingConnection,
      ...request,
      id: existingConnection.id,
      projectId,
      status: AppConnectionStatus.ACTIVE,
      value: {
        ...validatedConnectionValue,
        ...restoredConnectionValue,
      },
    };
  },

  async getOne({
    projectId,
    name,
  }: GetOneByName): Promise<AppConnection | null> {
    const encryptedAppConnection = await repo().findOneBy({
      projectId,
      name,
    });

    if (isNil(encryptedAppConnection)) {
      return encryptedAppConnection;
    }

    const appConnection = decryptConnection(encryptedAppConnection);
    if (!needRefresh(appConnection)) {
      return oauth2Util.removeRefreshTokenAndClientSecret(appConnection);
    }

    const refreshedConnection = await lockAndRefreshConnection({
      projectId,
      name,
    });
    if (isNil(refreshedConnection)) {
      return null;
    }
    return oauth2Util.removeRefreshTokenAndClientSecret(refreshedConnection);
  },

  async getOneOrThrow(params: GetOneParams): Promise<AppConnection> {
    const connectionById = await repo().findOneBy({
      id: params.id,
      projectId: params.projectId,
    });
    if (isNil(connectionById)) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          entityType: 'AppConnection',
          entityId: params.id,
        },
      });
    }
    return (await this.getOne({
      projectId: params.projectId,
      name: connectionById.name,
    }))!;
  },

  async delete(params: DeleteParams): Promise<void> {
    await repo().delete(params);
  },

  async list({
    projectId,
    blockNames,
    cursorRequest,
    name,
    status,
    limit,
    connectionsIds,
  }: ListParams): Promise<SeekPage<AppConnection>> {
    const decodedCursor = paginationHelper.decodeCursor(cursorRequest);

    const paginator = buildPaginator({
      entity: AppConnectionEntity,
      query: {
        limit,
        order: 'ASC',
        afterCursor: decodedCursor.nextCursor,
        beforeCursor: decodedCursor.previousCursor,
      },
    });

    const querySelector: Record<string, string | FindOperator<string>> = {
      projectId,
    };
    if (!isNil(blockNames) && blockNames.length > 0) {
      querySelector.blockName = In(blockNames);
    }
    if (!isNil(name)) {
      querySelector.name = ILike(`%${name}%`);
    }
    if (!isNil(status)) {
      querySelector.status = In(status);
    }

    if (!isNil(connectionsIds)) {
      querySelector.id = In(connectionsIds);
    }

    const queryBuilder = repo()
      .createQueryBuilder('app_connection')
      .where(querySelector);
    const { data, cursor } = await paginator.paginate(queryBuilder);
    const promises: Promise<AppConnection>[] = [];

    data.forEach((encryptedConnection) => {
      const apConnection: AppConnection =
        decryptConnection(encryptedConnection);
      promises.push(
        new Promise((resolve) => {
          return resolve(apConnection);
        }),
      );
    });

    const refreshConnections = await Promise.all(promises);

    return paginationHelper.createPage<AppConnection>(
      refreshConnections,
      cursor,
    );
  },

  async listActiveConnectionsByIds(
    projectId: string,
    connectionsIds: string[],
  ): Promise<AppConnectionWithoutSensitiveData[]> {
    return (
      await this.list({
        limit: 1000,
        projectId,
        connectionsIds,
        blockNames: undefined,
        cursorRequest: null,
        name: undefined,
        status: [AppConnectionStatus.ACTIVE],
      })
    ).data.map(removeSensitiveData);
  },

  async countByProject({ projectId }: CountByProjectParams): Promise<number> {
    return repo().countBy({ projectId });
  },
};

const validateConnectionValue = async (
  params: ValidateConnectionValueParams,
): Promise<AppConnectionValue> => {
  const { connection, projectId } = params;

  switch (connection.value.type) {
    case AppConnectionType.PLATFORM_OAUTH2: {
      const tokenUrl = await oauth2Util.getOAuth2TokenUrl({
        projectId,
        blockName: connection.blockName,
        props: connection.value.props,
      });
      return oauth2Handler[connection.value.type].claim({
        projectId,
        blockName: connection.blockName,
        request: {
          grantType: OAuth2GrantType.AUTHORIZATION_CODE,
          code: connection.value.code,
          tokenUrl,
          clientId: connection.value.client_id,
          props: connection.value.props,
          authorizationMethod: connection.value.authorization_method,
          codeVerifier: connection.value.code_challenge,
          redirectUrl: connection.value.redirect_url,
        },
      });
    }
    case AppConnectionType.CLOUD_OAUTH2: {
      const tokenUrl = await oauth2Util.getOAuth2TokenUrl({
        projectId,
        blockName: connection.blockName,
        props: connection.value.props,
      });
      const auth = await oauth2Handler[connection.value.type].claim({
        projectId,
        blockName: connection.blockName,
        request: {
          tokenUrl,
          grantType: OAuth2GrantType.AUTHORIZATION_CODE,
          code: connection.value.code,
          props: connection.value.props,
          clientId: connection.value.client_id,
          authorizationMethod: connection.value.authorization_method,
          codeVerifier: connection.value.code_challenge,
        },
      });
      await engineValidateAuth({
        blockName: connection.blockName,
        projectId,
        auth,
      });
      return auth;
    }
    case AppConnectionType.OAUTH2: {
      const tokenUrl = await oauth2Util.getOAuth2TokenUrl({
        projectId,
        blockName: connection.blockName,
        props: connection.value.props,
      });
      return oauth2Handler[connection.value.type].claim({
        projectId,
        blockName: connection.blockName,
        request: {
          tokenUrl,
          code: connection.value.code,
          clientId: connection.value.client_id,
          props: connection.value.props,
          grantType: connection.value.grant_type!,
          redirectUrl: connection.value.redirect_url,
          clientSecret: connection.value.client_secret,
          authorizationMethod: connection.value.authorization_method,
          codeVerifier: connection.value.code_challenge,
        },
      });
    }
    case AppConnectionType.CUSTOM_AUTH:
    case AppConnectionType.BASIC_AUTH:
    case AppConnectionType.SECRET_TEXT:
      await engineValidateAuth({
        blockName: connection.blockName,
        projectId,
        auth: connection.value,
      });
  }

  return connection.value;
};

function decryptConnection(
  encryptedConnection: AppConnectionSchema,
): AppConnection {
  const value = encryptUtils.decryptObject<AppConnectionValue>(
    encryptedConnection.value,
  );
  const connection: AppConnection = {
    ...encryptedConnection,
    value,
  };
  return connection;
}

/**
 * We should make sure this is accessed only once, as a race condition could occur where the token needs to be
 * refreshed and it gets accessed at the same time, which could result in the wrong request saving incorrect data.
 */
async function lockAndRefreshConnection({
  projectId,
  name,
}: {
  projectId: ProjectId;
  name: string;
}) {
  const refreshLock = await distributedLock.acquireLock({
    key: `${projectId}_${name}`,
    timeout: 20000,
  });

  let appConnection: AppConnection | null = null;

  try {
    const encryptedAppConnection = await repo().findOneBy({
      projectId,
      name,
    });
    if (isNil(encryptedAppConnection)) {
      return encryptedAppConnection;
    }
    appConnection = decryptConnection(encryptedAppConnection);
    if (!needRefresh(appConnection)) {
      return appConnection;
    }
    const refreshedAppConnection = await refresh(appConnection);

    await repo().update(refreshedAppConnection.id, {
      status: AppConnectionStatus.ACTIVE,
      value: encryptUtils.encryptObject(refreshedAppConnection.value),
    });
    return refreshedAppConnection;
  } catch (e) {
    exceptionHandler.handle(e);
    if (!isNil(appConnection) && oauth2Util.isUserError(e)) {
      appConnection.status = AppConnectionStatus.ERROR;
      await repo().update(appConnection.id, {
        status: appConnection.status,
        updated: dayjs().toISOString(),
      });
    }
  } finally {
    await refreshLock.release();
  }
  return appConnection;
}

function needRefresh(connection: AppConnection): boolean {
  if (connection.status === AppConnectionStatus.ERROR) {
    return false;
  }
  switch (connection.value.type) {
    case AppConnectionType.PLATFORM_OAUTH2:
    case AppConnectionType.CLOUD_OAUTH2:
    case AppConnectionType.OAUTH2:
      return oauth2Util.isExpired(connection.value);
    default:
      return false;
  }
}

async function refresh(connection: AppConnection): Promise<AppConnection> {
  switch (connection.value.type) {
    case AppConnectionType.PLATFORM_OAUTH2:
      connection.value = await oauth2Handler[connection.value.type].refresh({
        blockName: connection.blockName,
        projectId: connection.projectId,
        connectionValue: connection.value,
      });
      break;
    case AppConnectionType.CLOUD_OAUTH2:
      connection.value = await oauth2Handler[connection.value.type].refresh({
        blockName: connection.blockName,
        projectId: connection.projectId,
        connectionValue: connection.value,
      });
      break;
    case AppConnectionType.OAUTH2:
      connection.value = await oauth2Handler[connection.value.type].refresh({
        blockName: connection.blockName,
        projectId: connection.projectId,
        connectionValue: connection.value,
      });
      break;
    default:
      break;
  }
  return connection;
}

type UpsertParams = {
  userId: UserId;
  projectId: ProjectId;
  request: UpsertAppConnectionRequestBody;
};

type PatchParams = {
  userId: UserId;
  projectId: ProjectId;
  request: PatchAppConnectionRequestBody;
  block: BlockMetadataModel;
};

type GetOneByName = {
  projectId: ProjectId;
  name: string;
};

type GetOneParams = {
  projectId: ProjectId;
  id: string;
};

type DeleteParams = {
  projectId: ProjectId;
  id: AppConnectionId;
};

type ListParams = {
  projectId: ProjectId;
  blockNames: string[] | undefined;
  connectionsIds?: string[];
  cursorRequest: Cursor | null;
  name: string | undefined;
  status: AppConnectionStatus[] | undefined;
  limit: number;
};

type CountByProjectParams = {
  projectId: ProjectId;
};

type ValidateConnectionValueParams = {
  connection: UpsertAppConnectionRequestBody;
  projectId: ProjectId;
};
