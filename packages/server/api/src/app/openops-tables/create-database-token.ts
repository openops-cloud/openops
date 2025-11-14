import { createAxiosHeaders, makeOpenOpsTablesPost } from '@openops/common';

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
  name: string;
  workspaceId: number;
  databaseId: number;
  scopes: string[];
  systemToken: string;
};

export async function createDatabaseToken(
  params: CreateDatabaseTokenParams,
): Promise<DatabaseToken> {
  const payload = {
    name: params.name,
    workspace: params.workspaceId,
    database_id: params.databaseId,
    scopes: params.scopes,
  };

  const headers = createAxiosHeaders(params.systemToken);
  const response = await makeOpenOpsTablesPost<DatabaseToken>(
    'api/database/tokens/',
    payload,
    headers,
  );

  return response;
}
