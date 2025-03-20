import {
  createAxiosHeaders,
  makeOpenOpsTablesGet,
} from '../openops-tables/requests-helpers';
import { getDefaultDatabaseId } from './applications-service';
import { authenticateDefaultUserInOpenOpsTables } from './auth-user';

async function getTables(
  token: string,
  databaseId: number,
): Promise<OpenOpsTable[]> {
  const authenticationHeader = createAxiosHeaders(token);
  const getTablesResult = await makeOpenOpsTablesGet<OpenOpsTable[]>(
    `api/database/tables/database/${databaseId}/`,
    authenticationHeader,
  );
  return getTablesResult.flatMap((item) => item);
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

  const table = tables.find((t) => t.name === tableName);

  return table;
}

export async function getTableNames(): Promise<string[]> {
  const tables = await getAvailableTablesInOpenopsTables();

  return tables.map((t) => t.name);
}

async function getAvailableTablesInOpenopsTables(): Promise<OpenOpsTable[]> {
  const { token } = await authenticateDefaultUserInOpenOpsTables();

  const tablesDatabaseId = await getDefaultDatabaseId(token);

  const tables = await getTables(token, tablesDatabaseId);

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
