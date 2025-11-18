import {
  createAxiosHeaders,
  DatabaseToken,
  makeOpenOpsTablesGet,
} from '@openops/common';

export async function listDatabaseTokens(
  workspaceId: number,
  token: string,
): Promise<DatabaseToken[]> {
  const tokens = await makeOpenOpsTablesGet<DatabaseToken>(
    'api/database/tokens/',
    createAxiosHeaders(token),
  );

  return tokens.flat().filter((t) => t.workspace === workspaceId);
}
