import { AxiosHeaders } from 'axios';
import {
  createAxiosHeaders,
  createAxiosHeadersForOpenOpsTablesBlock,
  makeOpenOpsTablesGet,
} from '../openops-tables/requests-helpers';
import {
  getDefaultDatabaseId,
  getDefaultDatabaseIdForOpenOpsTablesBlock,
} from './applications-service';
import { authenticateDefaultUserInOpenOpsTables } from './auth-user';

async function getTables(
  token: string,
  databaseId: number,
  useJwt = false,
): Promise<OpenOpsTable[]> {
  const authenticationHeader: AxiosHeaders = useJwt
    ? createAxiosHeaders(token)
    : createAxiosHeadersForOpenOpsTablesBlock(token);
  const getTablesResult = await makeOpenOpsTablesGet<OpenOpsTable[]>(
    `api/database/tables/database/${databaseId}/`,
    authenticationHeader,
  );
  return getTablesResult.flatMap((item) => item);
}

export async function getTableIdByTableName(
  tableName: string,
  token?: string,
  useJwt = false,
): Promise<number> {
  const table = await getTableByName(tableName, token, useJwt);

  if (!table) {
    throw new Error(`Table '${tableName}' not found`);
  }

  return table.id;
}

export async function getTableByName(
  tableName: string,
  token?: string,
  useJwt = false,
): Promise<OpenOpsTable | undefined> {
  const tables = await getAvailableTablesInOpenopsTables(token, useJwt);

  const table = tables.find((t) => t.name === tableName);

  return table;
}

export async function getTableNames(
  token?: string,
  useJwt = false,
): Promise<string[]> {
  const tables = await getAvailableTablesInOpenopsTables(token, useJwt);

  return tables.map((t) => t.name);
}

async function getAvailableTablesInOpenopsTables(
  token?: string,
  useJwt = false,
): Promise<OpenOpsTable[]> {
  const authToken =
    token ?? (await authenticateDefaultUserInOpenOpsTables()).token;
  const shouldUseJwt = token !== undefined ? useJwt : true;

  const getDatabaseId = shouldUseJwt
    ? getDefaultDatabaseId
    : getDefaultDatabaseIdForOpenOpsTablesBlock;
  const tablesDatabaseId = await getDatabaseId(authToken);

  const tables = await getTables(authToken, tablesDatabaseId, shouldUseJwt);

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
