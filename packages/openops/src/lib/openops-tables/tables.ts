import { ActionContext, PropertyContext } from '@openops/blocks-framework';
import { encryptUtils } from '@openops/server-shared';
import { EncryptedObject } from '@openops/shared';
import {
  createAxiosHeaders,
  createAxiosHeadersForOpenOpsTablesBlock,
  makeOpenOpsTablesGet,
} from '../openops-tables/requests-helpers';
import { getDefaultDatabaseId } from './applications-service';
import { authenticateDefaultUserInOpenOpsTables } from './auth-user';
import {
  getTablesDatabaseIdFromContext,
  getTablesDatabaseTokenFromContext,
  shouldUseDatabaseToken,
} from './context-helpers';

export async function getTableIdByTableNameFromContext(
  tableName: string,
  context: ActionContext | PropertyContext,
): Promise<number> {
  if (!shouldUseDatabaseToken()) {
    return await getTableIdByTableName(tableName);
  }

  const databaseId = getTablesDatabaseIdFromContext(context);
  const token = getTablesDatabaseTokenFromContext(context);
  return getTableIdByTableNameWithDatabaseToken(tableName, databaseId, token);
}

async function getTableIdByTableNameWithDatabaseToken(
  tableName: string,
  databaseId: number,
  token: string,
): Promise<number> {
  const table = await getTableByNameFromDatabaseToken(
    tableName,
    databaseId,
    token,
  );
  if (!table) {
    throw new Error(`Table '${tableName}' not found`);
  }
  return table.id;
}

export async function getTableByNameFromContext(
  tableName: string,
  context: ActionContext | PropertyContext,
): Promise<OpenOpsTable | undefined> {
  if (!shouldUseDatabaseToken()) {
    return await getTableByName(tableName);
  }

  const databaseId = getTablesDatabaseIdFromContext(context);
  const token = getTablesDatabaseTokenFromContext(context);
  return getTableByNameFromDatabaseToken(tableName, databaseId, token);
}

export async function getTableNamesFromContext(
  context: ActionContext | PropertyContext,
): Promise<string[]> {
  if (!shouldUseDatabaseToken()) {
    return await getTableNames();
  }

  const databaseId = getTablesDatabaseIdFromContext(context);
  const token = getTablesDatabaseTokenFromContext(context);
  const tables = await getTablesFromDatabaseToken(databaseId, token);
  return tables.map((t) => t.name);
}

export async function getDatabaseTableNames(
  databaseId: number,
  token: EncryptedObject,
): Promise<string[]> {
  const tables = await getTablesFromDatabaseToken(
    databaseId,
    encryptUtils.decryptString(token),
  );
  return tables.map((t) => t.name);
}

async function getTableByNameFromDatabaseToken(
  tableName: string,
  databaseId: number,
  token: string,
): Promise<OpenOpsTable | undefined> {
  const tables = await getTablesFromDatabaseToken(databaseId, token);
  return tables.find((t) => t.name === tableName);
}

export async function getTablesFromDatabaseToken(
  databaseId: number,
  token: string,
): Promise<OpenOpsTable[]> {
  const authenticationHeader = createAxiosHeadersForOpenOpsTablesBlock(token);
  const getTablesResult = await makeOpenOpsTablesGet<OpenOpsTable[]>(
    `api/database/tables/database/${databaseId}/`,
    authenticationHeader,
  );
  const tables = getTablesResult.flat();
  return getDistinctTableNames(tables);
}

export async function getTableIdByTableName(
  tableName: string,
): Promise<number> {
  const table = await getTableByName(tableName);
  if (!table) {
    throw new Error(`Table '${tableName}' not found`);
  }
  return table.id;
}

export async function getTableByName(
  tableName: string,
): Promise<OpenOpsTable | undefined> {
  const tables = await getAvailableTablesInOpenopsTables();
  return tables.find((t) => t.name === tableName);
}

export async function getTableNames(): Promise<string[]> {
  const tables = await getAvailableTablesInOpenopsTables();
  return tables.map((t) => t.name);
}

async function getAvailableTablesInOpenopsTables(): Promise<OpenOpsTable[]> {
  const { token } = await authenticateDefaultUserInOpenOpsTables();
  const tablesDatabaseId = await getDefaultDatabaseId(token);
  const authenticationHeader = createAxiosHeaders(token);
  const getTablesResult = await makeOpenOpsTablesGet<OpenOpsTable[]>(
    `api/database/tables/database/${tablesDatabaseId}/`,
    authenticationHeader,
  );
  const tables = getTablesResult.flat();
  return getDistinctTableNames(tables);
}

// Tables allows you to have tables with the same name in the same database.
// Since we are not using the table id for the requests we need to ensure that we always use the same table.
// That's why we are choosing the table by name with the smallest id (the oldest.)
//
// Baserow request: https://gitlab.com/baserow/baserow/-/issues/792
function getDistinctTableNames(tables: OpenOpsTable[]): OpenOpsTable[] {
  const tablesMap = new Map<string, OpenOpsTable>();
  for (const table of tables) {
    if (
      !tablesMap.has(table.name) ||
      tablesMap.get(table.name)!.id > table.id
    ) {
      tablesMap.set(table.name, table);
    }
  }

  return Array.from(tablesMap.values());
}

export interface OpenOpsTable {
  id: number;
  name: string;
}
