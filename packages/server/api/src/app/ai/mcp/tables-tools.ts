import { resolveTokenProvider, TablesMcpEndpoint } from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { experimental_createMCPClient as createMCPClient, ToolSet } from 'ai';
import { openopsTables } from '../../openops-tables';
import { projectService } from '../../project/project-service';
import { MCPTool } from './types';

export async function getTablesTools(projectId: string): Promise<MCPTool> {
  const mcpEndpoint = await getProjectMcpEndpoint(projectId);

  if (!mcpEndpoint) {
    logger.error('No MCP endpoints found on OpenOps Tables');
    return {
      client: undefined,
      toolSet: {},
    };
  }

  const url =
    system.get(AppSystemProp.OPENOPS_TABLES_API_URL) +
    `/openops-tables/mcp/${mcpEndpoint.key}/sse`;

  const client = await createMCPClient({
    transport: {
      type: 'sse',
      url,
    },
  });

  const tools = await client.tools();

  const toolSet: ToolSet = {};
  for (const [name, tool] of Object.entries(tools)) {
    if (name.includes('list')) {
      toolSet[name] = {
        ...tool,
        toolProvider: 'tables',
      } as typeof tool & { toolProvider: string };
    }
  }

  return {
    client,
    toolSet,
  };
}

async function getProjectMcpEndpoint(
  projectId: string,
): Promise<TablesMcpEndpoint | undefined> {
  const project = await projectService.getOneOrThrow(projectId);

  const tokenOrResolver = await resolveTokenProvider({
    tablesDatabaseId: project.tablesDatabaseId,
    tablesDatabaseToken: project.tablesDatabaseToken,
  });

  const mcpEndpoints = await openopsTables.getMcpEndpointList(tokenOrResolver);

  const endpointExists = mcpEndpoints.find(
    (endpoint) => endpoint.workspace_id === project.tablesWorkspaceId,
  );

  if (!endpointExists) {
    return;
  }

  return endpointExists;
}
