import {
  createAxiosHeaders,
  makeOpenOpsTablesRequest,
  Workspace,
} from '@openops/common';

export async function getWorkspaceByName(
  token: string,
  name: string,
): Promise<Workspace | undefined> {
  const allWorkspaces = await makeOpenOpsTablesRequest<Workspace[]>(
    'get',
    `api/workspaces/`,
    undefined,
    createAxiosHeaders(token),
  );
  return allWorkspaces?.find((workspace) => workspace.name === name);
}
