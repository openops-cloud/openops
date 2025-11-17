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

export type CreateDatabaseTokenParams = {
  token: string;
  projectId: string;
  workspaceId: number;
};

export async function createProjectDatabaseToken(
  params: CreateDatabaseTokenParams,
): Promise<DatabaseToken> {
  const payload = {
    name: `${TOKEN_NAME_PREFIX}${params.projectId}`,
    workspace: params.workspaceId,
  };

  const headers = createAxiosHeaders(params.token);

  return makeOpenOpsTablesPost<DatabaseToken>(
    'api/database/tokens/',
    payload,
    headers,
  );
}
