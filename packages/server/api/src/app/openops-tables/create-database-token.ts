import { createAxiosHeaders, makeOpenOpsTablesPost } from '@openops/common';

const TOKEN_NAME_PREFIX = 'Project_';

export type DatabaseToken = {
  id: number;
  name: string;
  workspace: number;
  key: string;
  permissions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
};

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
