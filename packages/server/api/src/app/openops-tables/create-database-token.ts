import {
  createAxiosHeaders,
  DatabaseToken,
  makeOpenOpsTablesPost,
} from '@openops/common';

export async function createDatabaseToken(
  workspaceId: number,
  token: string,
): Promise<DatabaseToken> {
  const payload = {
    name: 'OpenOps Token',
    workspace: workspaceId,
  };

  const headers = createAxiosHeaders(token);

  return makeOpenOpsTablesPost<DatabaseToken>(
    'api/database/tokens/',
    payload,
    headers,
  );
}
