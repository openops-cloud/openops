import { encryptUtils } from '@openops/server-shared';
import {
  createAxiosHeaders,
  makeOpenOpsTablesGet,
} from '../openops-tables/requests-helpers';
import {
  getDefaultDatabaseId,
  getDefaultDatabaseIdForOpenOpsTablesBlock,
} from './applications-service';
import { authenticateDefaultUserInOpenOpsTables } from './auth-user';
import { createRequestContext, type RequestContext } from './request-context';

async function getTablesWithContext(
  ctx: RequestContext,
  databaseId: number,
): Promise<OpenOpsTable[]> {
  const authenticationHeader = ctx.createHeaders(ctx.token);
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

export async function getTableNamesWithContext(ctx: {
  server: {
    tablesDatabaseId: number;
    tablesDatabaseToken: { iv: string; data: string };
  };
}): Promise<string[]> {
  const token = encryptUtils.decryptString(ctx.server.tablesDatabaseToken);
  const tables = await getAvailableTablesWithContext(
    createRequestContext(token, false),
    ctx.server.tablesDatabaseId,
  );
  return tables.map((t) => t.name);
}

async function getAvailableTablesWithContext(
  ctx?: RequestContext,
  tablesDatabaseId?: number,
): Promise<OpenOpsTable[]> {
  const requestContext =
    ctx ??
    (await (async () => {
      const { token } = await authenticateDefaultUserInOpenOpsTables();
      return createRequestContext(token, true);
    })());

  let databaseId: number;
  if (tablesDatabaseId !== undefined) {
    databaseId = tablesDatabaseId;
  } else {
    const isJwt = requestContext.createHeaders === createAxiosHeaders;
    const getDatabaseId = isJwt
      ? getDefaultDatabaseId
      : getDefaultDatabaseIdForOpenOpsTablesBlock;
    databaseId = await getDatabaseId(requestContext.token);
  }

  const tables = await getTablesWithContext(requestContext, databaseId);

  return getDistinctTableNames(tables);
}

/**
 * @deprecated Use getAvailableTablesWithContext with RequestContext instead
 */
async function getAvailableTablesInOpenopsTables(
  token?: string,
  useJwt = false,
): Promise<OpenOpsTable[]> {
  if (token === undefined) {
    return getAvailableTablesWithContext();
  }
  const ctx = createRequestContext(token, useJwt);
  return getAvailableTablesWithContext(ctx);
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
