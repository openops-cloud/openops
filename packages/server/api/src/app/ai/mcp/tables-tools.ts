import { createMCPClient } from '@ai-sdk/mcp';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { Tool, ToolSet } from 'ai';
import { projectService } from '../../project/project-service';
import { MCPTool } from './types';

export async function getTablesTools(projectId: string): Promise<MCPTool> {
  const mcpEndpoint = await projectService.getProjectMcpEndpoint(projectId);

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
      } as Tool & { toolProvider: string };
    }
  }

  return {
    client,
    toolSet,
  };
}
