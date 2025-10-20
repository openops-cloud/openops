import { createAxiosHeaders, makeOpenOpsTablesGet } from '@openops/common';
import { Workspace } from './create-workspace';

export async function listWorkspaces(token: string): Promise<Workspace[]> {
  const getTablesResult: Workspace[] = await makeOpenOpsTablesGet<Workspace>(
    'api/workspaces/',
    createAxiosHeaders(token),
  );

  return getTablesResult.flat();
}
