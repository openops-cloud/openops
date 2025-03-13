import { addUserToWorkspace } from './add-user-workspace';
import { createDatabase } from './create-database';
import { createTable } from './create-table';
import { createUser } from './create-user';
import { createWorkspace } from './create-workspace';
import { createDefaultWorkspaceAndDatabase } from './default-workspace-database';
import { renameDatabase } from './rename-database';

export const openopsTables = {
  createUser,
  addUserToWorkspace,
  createDatabase,
  createTable,
  createWorkspace,
  createDefaultWorkspaceAndDatabase,
  renameDatabase,
};
