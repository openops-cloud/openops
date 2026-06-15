import { createAxiosHeaders, makeOpenOpsTablesDelete } from '@openops/common';

export async function deleteWorkspace(
  workspaceId: number,
  token: string,
): Promise<void> {
  await makeOpenOpsTablesDelete(
    `api/workspaces/${workspaceId}/`,
    createAxiosHeaders(token),
  );
}
