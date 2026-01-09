import { OPENOPS_DEFAULT_DATABASE_NAME } from '@openops/common';
import { encryptUtils, logger } from '@openops/server-shared';
import { EncryptedObject } from '@openops/shared';
import { openopsTables } from './index';

export const OPENOPS_DEFAULT_WORKSPACE_NAME = 'OpenOps Workspace';

export type TablesWorkspaceContext<TDatabaseToken = string> = {
  workspaceId: number;
  databaseId: number;
  databaseToken: TDatabaseToken;
};

export async function createDefaultWorkspaceAndDatabase(
  params: TablesWorkspaceContext<EncryptedObject> | undefined,
  token: string,
): Promise<TablesWorkspaceContext> {
  const workspaceId = await ensureTablesWorkspaceExists(
    token,
    params?.workspaceId,
  );

  const databaseId = await ensureTablesDatabaseExists(
    token,
    workspaceId,
    params?.databaseId,
  );

  const databaseToken = await ensureDatabaseTokenExists(
    token,
    workspaceId,
    params?.databaseToken,
  );

  return {
    databaseToken,
    workspaceId,
    databaseId,
  };
}

async function ensureTablesWorkspaceExists(
  token: string,
  workspaceId?: number,
): Promise<number> {
  if (workspaceId) {
    logger.debug(
      `Workspace ID provided. Verifying existence in OpenOps tables.`,
      {
        workspaceId,
      },
    );

    return getWorkspaceId(token, workspaceId);
  }

  logger.debug(`Creating new workspace in OpenOps tables.`);
  const workspace = await openopsTables.createWorkspace(
    OPENOPS_DEFAULT_WORKSPACE_NAME,
    token,
  );

  logger.debug(`Workspace (${workspace.id}) created successfully.`);
  return workspace.id;
}

async function getWorkspaceId(
  token: string,
  workspaceId: number,
): Promise<number> {
  const workspaces = await openopsTables.listWorkspaces(token);

  const exists = workspaces.some((w) => w.id === workspaceId);
  if (!exists) {
    throw new Error(
      `Workspace ${workspaceId} was not found in OpenOps Tables.`,
    );
  }

  logger.debug(`Workspace (${workspaceId}) already exists in OpenOps tables.`);
  return workspaceId;
}

async function ensureTablesDatabaseExists(
  token: string,
  workspaceId: number,
  databaseId?: number,
): Promise<number> {
  if (databaseId) {
    logger.debug(
      `Database ID provided. Verifying existence in OpenOps tables.`,
      {
        workspaceId,
        databaseId,
      },
    );

    return getDatabaseId(token, workspaceId, databaseId);
  }

  logger.debug(`Creating new database in OpenOps tables.`);
  const database = await openopsTables.createDatabase(
    workspaceId,
    OPENOPS_DEFAULT_DATABASE_NAME,
    token,
  );

  logger.debug(`Database (${database.id}) created successfully.`);
  return database.id;
}

async function getDatabaseId(
  token: string,
  workspaceId: number,
  databaseId: number,
): Promise<number> {
  const databases = await openopsTables.listDatabases(workspaceId, token);

  const exists = databases.some((d) => d.id === databaseId);
  if (!exists) {
    throw new Error(
      `Database ${databaseId} does not exist in workspace ${workspaceId} in OpenOps Tables.`,
    );
  }

  logger.debug(`Database (${databaseId}) already exists in OpenOps tables.`);
  return databaseId;
}

async function ensureDatabaseTokenExists(
  token: string,
  workspaceId: number,
  databaseToken?: EncryptedObject,
): Promise<string> {
  if (databaseToken) {
    logger.debug(
      `Database Token provided. Verifying existence in OpenOps tables.`,
      {
        workspaceId,
        databaseToken,
      },
    );

    return getDatabaseToken(token, workspaceId, databaseToken);
  }

  logger.debug(`Creating new database token in OpenOps tables.`);
  const newToken = await openopsTables.createDatabaseToken(workspaceId, token);

  logger.debug(`Database token created successfully.`);
  return newToken.key;
}

async function getDatabaseToken(
  token: string,
  workspaceId: number,
  databaseToken: EncryptedObject,
): Promise<string> {
  const databaseTokens = await openopsTables.listDatabaseTokens(
    workspaceId,
    token,
  );

  const tablesDatabaseToken = encryptUtils.decryptString(databaseToken);
  const exists = databaseTokens.some((dt) => dt.key === tablesDatabaseToken);
  if (!exists) {
    throw new Error(`Database token was not found in OpenOps Tables.`);
  }

  logger.debug(`Database token already exists in OpenOps tables.`);
  return tablesDatabaseToken;
}
