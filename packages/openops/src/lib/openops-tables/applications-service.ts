import { AxiosHeaders } from 'axios';
import {
  createAxiosHeaders,
  createAxiosHeadersForOpenOpsTablesBlock,
  makeOpenOpsTablesGet,
} from './requests-helpers';
import { Application } from './types';

export const OPENOPS_DEFAULT_DATABASE_NAME = 'OpenOps Dataset';

async function getDefaultDatabaseIdInternal(
  token: string,
  autheticationHeaderCallback: (token: string) => AxiosHeaders,
  databaseName = OPENOPS_DEFAULT_DATABASE_NAME, // TODO: remove this when all environments are migrated
): Promise<number> {
  const authenticationHeader = autheticationHeaderCallback(token);

  const getTablesResult: Application[] =
    await makeOpenOpsTablesGet<Application>(
      `api/applications/`,
      authenticationHeader,
    );

  const defaultDatabase: Application | undefined = getTablesResult
    .flatMap((item) => item)
    .find((t) => t.type === 'database' && t.name === databaseName);

  if (!defaultDatabase) {
    throw new Error('Default database not found');
  }

  return defaultDatabase.id;
}

export const getDefaultDatabaseId = (
  token: string,
  databaseName = OPENOPS_DEFAULT_DATABASE_NAME,
): Promise<number> =>
  getDefaultDatabaseIdInternal(token, createAxiosHeaders, databaseName);

export const getDefaultDatabaseIdForOpenOpsTablesBlock = (
  token: string,
  databaseName = OPENOPS_DEFAULT_DATABASE_NAME,
): Promise<number> =>
  getDefaultDatabaseIdInternal(
    token,
    createAxiosHeadersForOpenOpsTablesBlock,
    databaseName,
  );
