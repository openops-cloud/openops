import { OPENOPS_DEFAULT_DATABASE_NAME } from '@openops/common';
import { openopsTables } from './index';

export const OPENOPS_DEFAULT_WORKSPACE_NAME = 'OpenOps Workspace';

export async function createDefaultWorkspaceAndDatabase(
  token: string,
): Promise<{ workspaceId: number; databaseId: number; databaseToken: string }> {
  const workspaceId = await getWorkspaceId(token);

  const databaseId = await getDatabaseId(workspaceId, token);

  const databaseToken = await getDatabaseToken(workspaceId, token);

  return {
    databaseToken,
    workspaceId,
    databaseId,
  };
}

async function getWorkspaceId(token: string): Promise<number> {
  const workspaces = await openopsTables.listWorkspaces(token);

  let workspaceId = 0;
  if (workspaces.length > 1) {
    throw new Error(
      'The user has multiple workspaces created in OpenOps Tables.',
    );
  } else if (workspaces.length === 1) {
    workspaceId = workspaces[0].id;
  } else {
    const workspace = await openopsTables.createWorkspace(
      OPENOPS_DEFAULT_WORKSPACE_NAME,
      token,
    );

    workspaceId = workspace.id;
  }

  return workspaceId;
}

async function getDatabaseId(
  workspaceId: number,
  token: string,
): Promise<number> {
  const databases = await openopsTables.listDatabases(workspaceId, token);

  let databaseId = 0;
  if (databases.length > 1) {
    throw new Error(
      'The user has multiple databases created in OpenOps Tables.',
    );
  } else if (databases.length === 1) {
    databaseId = databases[0].id;
  } else {
    const database = await openopsTables.createDatabase(
      workspaceId,
      OPENOPS_DEFAULT_DATABASE_NAME,
      token,
    );

    databaseId = database.id;
  }

  return databaseId;
}

async function getDatabaseToken(
  workspaceId: number,
  token: string,
): Promise<string> {
  const databaseTokens = await openopsTables.listDatabaseTokens(
    workspaceId,
    token,
  );

  let tablesToken = '';
  if (databaseTokens.length > 1) {
    throw new Error(
      'The user has multiple databases created in OpenOps Tables.',
    );
  } else if (databaseTokens.length === 1) {
    tablesToken = databaseTokens[0].key;
  } else {
    const newToken = await openopsTables.createDatabaseToken(
      workspaceId,
      token,
    );

    tablesToken = newToken.key;
  }

  return tablesToken;
}
