import { resolveTokenProvider } from '@openops/common';
import { logger } from '@openops/server-shared';
import { openopsTables } from '../../openops-tables';
import { applyToEachTablesDatabase } from './tables-database-iterator';

export const ensureTablesMcpEndpointExists = async (): Promise<void> => {
  await applyToEachTablesDatabase(async (tablesContext): Promise<void> => {
    const tokenOrResolver = await resolveTokenProvider(tablesContext);

    const mcpEndpoints = await openopsTables.getMcpEndpointList(
      tokenOrResolver,
    );

    const endpointExists = mcpEndpoints.some(
      (endpoint) => endpoint.workspace_id === tablesContext.tablesWorkspaceId,
    );

    if (endpointExists) {
      logger.info('MCP endpoint already exists; skipping', {
        tablesWorkspaceId: tablesContext.tablesWorkspaceId,
      });

      return;
    }

    logger.info(`MCP endpoint does not exist, creating it`, {
      tablesWorkspaceId: tablesContext.tablesWorkspaceId,
    });

    await openopsTables.createMcpEndpoint(
      tokenOrResolver,
      tablesContext.tablesWorkspaceId,
    );
  });
};
