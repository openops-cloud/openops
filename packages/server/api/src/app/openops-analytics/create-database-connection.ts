import {
  createAxiosHeadersForAnalytics,
  makeOpenOpsAnalyticsGet,
  makeOpenOpsAnalyticsPost,
} from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AxiosHeaders } from 'axios';

type DatabaseConnection = { id: number; uuid: string };

export async function getOrCreatePostgresDatabaseConnection(
  token: string,
  dbName: string,
  dbPassword: string,
  port: string,
  dbUserName: string,
  host: string,
  connectionName: string,
): Promise<DatabaseConnection> {
  const authenticationHeader = createAxiosHeadersForAnalytics(token);

  const existingConnection = await getDatabaseConnection(
    connectionName,
    authenticationHeader,
  );

  if (existingConnection) {
    return existingConnection;
  }

  const requestBody = {
    database_name: connectionName,
    sqlalchemy_uri: `postgresql://${dbUserName}:${dbPassword}@${host}:${port}/${dbName}`,
    expose_in_sqllab: true,
  };

  const databaseConnection = await makeOpenOpsAnalyticsPost<{
    id: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any;
  }>('database', requestBody, authenticationHeader);
  logger.info(
    `Database connection with name: ${connectionName} has been created.`,
    {
      databaseConnectionName: connectionName,
      databaseConnectionId: databaseConnection.id,
    },
  );
  return { id: databaseConnection.id, ...databaseConnection.result };
}

export async function getOrCreateOpenOpsTablesDatabaseConnection(
  token: string,
): Promise<{ id: number; uuid: string }> {
  return getOrCreatePostgresDatabaseConnection(
    token,
    system.getOrThrow(AppSystemProp.OPENOPS_TABLES_DATABASE_NAME),
    system.getOrThrow(AppSystemProp.POSTGRES_PASSWORD),
    system.getOrThrow(AppSystemProp.POSTGRES_PORT),
    system.getOrThrow(AppSystemProp.POSTGRES_USERNAME),
    system.get(AppSystemProp.OPENOPS_TABLES_DB_HOST) ??
      system.getOrThrow(AppSystemProp.POSTGRES_HOST),
    'openops_tables_connection',
  );
}

async function getDatabaseConnection(
  name: string,
  authenticationHeader: AxiosHeaders,
): Promise<DatabaseConnection | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await makeOpenOpsAnalyticsGet<{ result: any[] }>(
    `database?q=(filters:!((col:database_name,opr:eq,value:'${name}')))`,
    authenticationHeader,
  );

  return response && response?.result && response.result.length === 1
    ? {
        id: response.result[0].id,
        uuid: response.result[0].uuid,
        ...response.result[0],
      }
    : undefined;
}
