import { OPENOPS_DEFAULT_DATABASE_NAME } from '@openops/common';
import { openopsTables } from './index';

export const OPENOPS_DEFAULT_WORKSPACE_NAME = 'OpenOps Workspace';

export async function createDefaultWorkspaceAndDatabase(
  token: string,
): Promise<{ workspaceId: number; databaseId: number }> {
  const workspace = await openopsTables.createWorkspace(
    OPENOPS_DEFAULT_WORKSPACE_NAME,
    token,
  );

  const database = await openopsTables.createDatabase(
    workspace.id,
    OPENOPS_DEFAULT_DATABASE_NAME,
    token,
  );

  return {
    workspaceId: workspace.id,
    databaseId: database.id,
  };
}
