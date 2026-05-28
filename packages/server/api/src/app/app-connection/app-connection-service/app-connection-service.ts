import { BlockAuthProperty } from '@openops/blocks-framework';
import {
  distributedLock,
  encryptUtils,
  exceptionHandler,
} from '@openops/server-shared';
import {
  AppConnection,
  AppConnectionId,
  AppConnectionSortBy,
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
  SortDirection,
  UpsertAppConnectionRequestBody,
  UserId,
} from '@openops/shared';
import dayjs from 'dayjs';
import { FindOperator, ILike, In } from 'typeorm';
import { repoFactory } from '../../core/db/repo-factory';
import { parseAndVerify } from '../../helper/json-validator';
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
const DEFAULT_SORT_BY = AppConnectionSortBy.UPDATED;
const DEFAULT_SORT_DIRECTION = SortDirection.DESC;

export const appConnectionService = {
  async upsert(params: UpsertParams): Promise<AppConnection> {
    const { projectId, request } = params;

    parseAndVerify(UpsertAppConnectionRequestBody, request);

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
      authProviderKey: request.authProviderKey,
    };

    await repo().upsert(connection, ['name', 'projectId']);

    const updatedConnection = await repo().findOneByOrFail({
      name: request.name,
      projectId,
    });

    const telemetryEvent = existingConnection
      ? sendConnectionUpdatedEvent
      : sendConnectionCreatedEvent;
    telemetryEvent(params.userId, projectId, request.authProviderKey);

    return decryptConnection(updatedConnection);
  },

  async patch(params: PatchParams): Promise<AppConnection> {
    const { projectId, request } = params;

    parseAndVerify(PatchAppConnectionRequestBody, request);

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
      params.authProperty,
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
      id: existingConnection.id,
      projectId,
    });

    sendConnectionUpdatedEvent(
      params.userId,
      projectId,
      request.authProviderKey,
    );

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
      return null;
    }

    return decryptAndRefresh(encryptedAppConnection);
  },

  async getOneOrThrow(params: GetOneParams): Promise<AppConnection> {
    const encryptedAppConnection = await repo().findOneBy({
      id: params.id,
      projectId: params.projectId,
    });

    if (isNil(encryptedAppConnection)) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          entityType: 'AppConnection',
          entityId: params.id,
        },
      });
    }

    const connection = await decryptAndRefresh(encryptedAppConnection);
    if (isNil(connection)) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          entityType: 'AppConnection',
          entityId: params.id,
        },
      });
    }

    return connection;
  },

  async delete(params: DeleteParams): Promise<void> {
    await repo().delete(params);
  },

  async list(params: ListParams): Promise<SeekPage<AppConnection>> {
    const {
      projectId,
      cursorRequest,
      name,
      status,
      limit,
      connectionsIds,
      authProviders,
      sortBy,
      sortDirection,
    } = params;

    const sortingConfig = resolveAppConnectionSorting({
      sortBy,
      sortDirection,
    });
    const decodedCursor = paginationHelper.decodeCursor(cursorRequest);

    const paginator = buildPaginator({
      entity: AppConnectionEntity,
      query: {
        limit,
        order: sortingConfig.order,
        afterCursor: decodedCursor.nextCursor,
        beforeCursor: decodedCursor.previousCursor,
      },
      customPaginationColumn: {
        columnPath: sortingConfig.columnPath,
        columnName: sortingConfig.columnName,
        columnType: sortingConfig.columnType,
      },
    });

    const queryBuilder = repo()
      .createQueryBuilder('app_connection')
      .where(buildWhereClause({ projectId, name, status, connectionsIds }));

    if (!isNil(authProviders) && authProviders.length > 0) {
      queryBuilder.andWhere(
        'LOWER(app_connection.authProviderKey) IN (:...authProviders)',
        { authProviders: authProviders.map((p) => p.toLowerCase()) },
      );
    }

    const { data, cursor } = await paginator.paginate(queryBuilder);
    const decryptedConnections = data.map(decryptConnection);

    return paginationHelper.createPage<AppConnection>(
      decryptedConnections,
      cursor,
    );
  },

  async listActiveConnectionsByIds(
    projectId: string,
    connectionsIds: string[],
  ): Promise<AppConnectionWithoutSensitiveData[]> {
    const page = await this.list({
      limit: 1000,
      projectId,
      connectionsIds,
      cursorRequest: null,
      name: undefined,
      status: [AppConnectionStatus.ACTIVE],
      authProviders: undefined,
    });
    return page.data.map(removeSensitiveData);
  },

  async validateConnections(connection: AppConnectionSchema): Promise<void> {
    const decryptedConnection = decryptConnection(connection);

    const isOAuthConnection = [
      AppConnectionType.PLATFORM_OAUTH2,
      AppConnectionType.CLOUD_OAUTH2,
      AppConnectionType.OAUTH2,
    ].includes(decryptedConnection.value.type);

    if (isOAuthConnection) {
      const refreshedConnection = await lockAndRefreshConnection({
        projectId: decryptedConnection.projectId,
        name: decryptedConnection.name,
        forceRefresh: true,
      });

      if (isNil(refreshedConnection)) {
        throw new Error(
          `Failed to refresh connection: ${decryptedConnection.name}`,
        );
      }

      return;
    }

    await validateConnectionValue({
      connection: {
        ...connection,
        value: decryptedConnection.value,
      } as UpsertAppConnectionRequestBody,
      projectId: decryptedConnection.projectId,
    });
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
        authProviderKey: connection.authProviderKey,
        props: connection.value.props,
      });
      return oauth2Handler[connection.value.type].claim({
        projectId,
        authProviderKey: connection.authProviderKey,
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
        authProviderKey: connection.authProviderKey,
        props: connection.value.props,
      });
      const auth = await oauth2Handler[connection.value.type].claim({
        projectId,
        authProviderKey: connection.authProviderKey,
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
        authProviderKey: connection.authProviderKey,
        projectId,
        auth,
      });
      return auth;
    }
    case AppConnectionType.OAUTH2: {
      const tokenUrl = await oauth2Util.getOAuth2TokenUrl({
        projectId,
        authProviderKey: connection.authProviderKey,
        props: connection.value.props,
      });

      if (!connection.value.grant_type) {
        throw new Error('Grant type is required for OAuth2 connections');
      }

      return oauth2Handler[connection.value.type].claim({
        projectId,
        authProviderKey: connection.authProviderKey,
        request: {
          tokenUrl,
          code: connection.value.code,
          clientId: connection.value.client_id,
          props: connection.value.props,
          grantType: connection.value.grant_type,
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
        authProviderKey: connection.authProviderKey,
        projectId,
        auth: connection.value,
      });
      return connection.value;
    default:
      return connection.value;
  }
};

function decryptConnection(
  encryptedConnection: AppConnectionSchema,
): AppConnection {
  const value = encryptUtils.decryptObject<AppConnectionValue>(
    encryptedConnection.value,
  );

  return {
    ...encryptedConnection,
    value,
  };
}

async function decryptAndRefresh(
  encryptedAppConnection: AppConnectionSchema,
): Promise<AppConnection | null> {
  const appConnection = decryptConnection(encryptedAppConnection);

  if (!needRefresh(appConnection)) {
    return oauth2Util.removeRefreshTokenAndClientSecret(appConnection);
  }

  const refreshedConnection = await lockAndRefreshConnection({
    projectId: appConnection.projectId,
    name: appConnection.name,
  });

  if (isNil(refreshedConnection)) {
    return null;
  }
  return oauth2Util.removeRefreshTokenAndClientSecret(refreshedConnection);
}

/**
 * Acquires a distributed lock before refreshing to prevent race conditions
 * where concurrent access could save incorrect token data.
 */
async function lockAndRefreshConnection({
  forceRefresh = false,
  projectId,
  name,
}: {
  forceRefresh?: boolean;
  projectId: ProjectId;
  name: string;
}): Promise<AppConnection | null> {
  const refreshLock = await distributedLock.acquireLock({
    key: `${projectId}_${name}`,
    timeout: 20000,
  });

  try {
    const encryptedAppConnection = await repo().findOneBy({
      projectId,
      name,
    });

    if (isNil(encryptedAppConnection)) {
      return null;
    }

    const appConnection = decryptConnection(encryptedAppConnection);
    if (!forceRefresh && !needRefresh(appConnection)) {
      return appConnection;
    }

    return await refreshAndPersist(appConnection);
  } finally {
    await refreshLock.release();
  }
}

async function refreshAndPersist(
  appConnection: AppConnection,
): Promise<AppConnection> {
  try {
    const refreshedAppConnection = await refresh(appConnection);

    await repo().update(refreshedAppConnection.id, {
      status: AppConnectionStatus.ACTIVE,
      value: encryptUtils.encryptObject(refreshedAppConnection.value),
    });
    return refreshedAppConnection;
  } catch (e) {
    exceptionHandler.handle(e);
    if (oauth2Util.isUserError(e)) {
      await repo().update(appConnection.id, {
        status: AppConnectionStatus.ERROR,
        updated: dayjs().toISOString(),
      });

      return { ...appConnection, status: AppConnectionStatus.ERROR };
    }

    return appConnection;
  }
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
    case AppConnectionType.PLATFORM_OAUTH2: {
      const value = await oauth2Handler[connection.value.type].refresh({
        authProviderKey: connection.authProviderKey,
        projectId: connection.projectId,
        connectionValue: connection.value,
      });
      return { ...connection, value };
    }
    case AppConnectionType.CLOUD_OAUTH2: {
      const value = await oauth2Handler[connection.value.type].refresh({
        authProviderKey: connection.authProviderKey,
        projectId: connection.projectId,
        connectionValue: connection.value,
      });
      return { ...connection, value };
    }
    case AppConnectionType.OAUTH2: {
      const value = await oauth2Handler[connection.value.type].refresh({
        authProviderKey: connection.authProviderKey,
        projectId: connection.projectId,
        connectionValue: connection.value,
      });
      return { ...connection, value };
    }
    default:
      return connection;
  }
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
  authProperty: BlockAuthProperty | undefined;
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
  connectionsIds?: string[];
  cursorRequest: Cursor | null;
  name: string | undefined;
  status: AppConnectionStatus[] | undefined;
  limit: number;
  authProviders: string[] | undefined;
  sortBy?: AppConnectionSortBy;
  sortDirection?: SortDirection;
};

type ValidateConnectionValueParams = {
  connection: UpsertAppConnectionRequestBody;
  projectId: ProjectId;
};

function buildWhereClause({
  projectId,
  name,
  status,
  connectionsIds,
}: {
  projectId: ProjectId;
  name?: string;
  status?: AppConnectionStatus[];
  connectionsIds?: string[];
}): Record<string, string | FindOperator<string>> {
  const where: Record<string, string | FindOperator<string>> = { projectId };

  if (!isNil(name)) {
    where.name = ILike(`%${name}%`);
  }
  if (!isNil(status)) {
    where.status = In(status);
  }
  if (!isNil(connectionsIds)) {
    where.id = In(connectionsIds);
  }

  return where;
}

function resolveAppConnectionSorting({
  sortBy,
  sortDirection,
}: {
  sortBy?: AppConnectionSortBy;
  sortDirection?: SortDirection;
}): {
  columnPath: string;
  columnName: string;
  columnType?: string;
  order: 'ASC' | 'DESC';
} {
  const resolvedSortBy = sortBy ?? DEFAULT_SORT_BY;
  const resolvedSortDirection = sortDirection ?? DEFAULT_SORT_DIRECTION;

  const sortByToColumnMap: Record<
    AppConnectionSortBy,
    { columnPath: string; columnName: string; columnType?: string }
  > = {
    [AppConnectionSortBy.NAME]: {
      columnPath: 'name',
      columnName: 'app_connection.name',
      columnType: 'string',
    },
    [AppConnectionSortBy.CREATED]: {
      columnPath: 'created',
      columnName: 'app_connection.created',
    },
    [AppConnectionSortBy.UPDATED]: {
      columnPath: 'updated',
      columnName: 'app_connection.updated',
    },
  };

  return {
    ...sortByToColumnMap[resolvedSortBy],
    order: resolvedSortDirection === SortDirection.ASC ? 'ASC' : 'DESC',
  };
}
