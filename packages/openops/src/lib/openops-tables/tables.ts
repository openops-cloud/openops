import { AxiosHeaders } from 'axios';
import {
  createAxiosHeaders,
  makeOpenOpsTablesGet,
} from '../openops-tables/requests-helpers';
import { resolveTokenProvider, TablesServerContext } from './context-helpers';

export interface OpenOpsTable {
  id: number;
  name: string;
}

async function getTables(
  token: string,
  databaseId: number,
  authenticationHeader: AxiosHeaders,
): Promise<OpenOpsTable[]> {
  const getTablesResult = await makeOpenOpsTablesGet<OpenOpsTable[]>(
    `api/database/tables/database/${databaseId}/`,
    authenticationHeader,
  );
  return getTablesResult.flat();
}

export async function getTableIdByTableName(
  tableName: string,
  tablesServerContext: TablesServerContext,
): Promise<number> {
  const table = await getTableByName(tableName, tablesServerContext);

  if (!table) {
    throw new Error(`Table '${tableName}' not found`);
  }

  return table.id;
}

export async function getTableByName(
  tableName: string,
  tablesServerContext: TablesServerContext,
): Promise<OpenOpsTable | undefined> {
  const tables = await getAvailableTablesInOpenopsTables(tablesServerContext);

  const table = tables.find((t) => t.name === tableName);

  return table;
}

export async function getTableNames(
  tablesServerContext: TablesServerContext,
): Promise<string[]> {
  const tables = await getAvailableTablesInOpenopsTables(tablesServerContext);

  return tables.map((t) => t.name);
}

async function getAvailableTablesInOpenopsTables(
  serverContext: TablesServerContext,
): Promise<OpenOpsTable[]> {
  const tokenOrContext = await resolveTokenProvider(serverContext);

  const tokenAndDatabaseId = {
    token:
      typeof tokenOrContext === 'string'
        ? tokenOrContext
        : tokenOrContext.getToken(),
    databaseId: serverContext.tablesDatabaseId,
  };

  const authenticationHeader = createAxiosHeaders(tokenOrContext);

  const { token, databaseId } = tokenAndDatabaseId;
  const tables = await getTables(token, databaseId, authenticationHeader);

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
