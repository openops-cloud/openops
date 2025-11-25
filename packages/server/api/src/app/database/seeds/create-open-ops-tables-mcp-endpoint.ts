import { logger } from '@openops/server-shared';
import { openopsTables } from '../../openops-tables';
import { OPENOPS_DEFAULT_WORKSPACE_NAME } from '../../openops-tables/default-workspace-database';

export const createOpenOpsTablesMcpEndpoint = async () => {
  const { token } = await openopsTables.authenticateAdminUserInOpenOpsTables();
  const mcpEndpoints = await openopsTables.getMcpEndpointList(token);
  const workspace = await openopsTables.getWorkspaceByName(
    token,
    OPENOPS_DEFAULT_WORKSPACE_NAME,
  );

  if (!mcpEndpoints?.length && workspace) {
    logger.info(`MCP endpoint does not exist, creating it`);

    await openopsTables.createMcpEndpoint(workspace?.id, token);
  }
};
