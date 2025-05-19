import { addUserToWorkspace } from './add-user-workspace';
import { createDatabase } from './create-database';
import { createMcpEndpoint } from './create-mcp-endpoint';
import { createTable } from './create-table';
import { createUser } from './create-user';
import { createWorkspace } from './create-workspace';
import { createDefaultWorkspaceAndDatabase } from './default-workspace-database';
import { getMcpEndpointList } from './get-mcp-endpoint-list';
import { getWorkspaceByName } from './get-workspace-by-name';
import { renameDatabase } from './rename-database';

export const openopsTables = {
  createUser,
  addUserToWorkspace,
  createDatabase,
  createTable,
  createWorkspace,
  createDefaultWorkspaceAndDatabase,
  renameDatabase,
  getMcpEndpointList,
  createMcpEndpoint,
  getWorkspaceByName,
};
