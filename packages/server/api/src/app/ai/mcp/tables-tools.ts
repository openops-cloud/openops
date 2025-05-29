import {
  authenticateDefaultUserInOpenOpsTables,
  createAxiosHeaders,
} from '@openops/common';
import { AppSystemProp, system } from '@openops/server-shared';
import { experimental_createMCPClient as createMCPClient, ToolSet } from 'ai';
import { openopsTables } from '../../openops-tables';
import { MCPTool } from './mcp-tools';

export async function getTablesTools(): Promise<MCPTool> {
  const { token } = await authenticateDefaultUserInOpenOpsTables();
  const mcpEndpoint = await openopsTables.getMcpEndpointList(token);
  if (!mcpEndpoint) {
    return {
      client: undefined,
      toolSet: {},
    };
  }

  const url =
    system.get(AppSystemProp.OPENOPS_TABLES_API_URL) +
    `/openops-tables/mcp/${mcpEndpoint[0].key}/sse`;

  const client = await createMCPClient({
    transport: {
      type: 'sse',
      url,
      headers: createAxiosHeaders(token),
    },
  });

  const tools = await client.tools();

  const toolSet: ToolSet = {};
  for (const [name, tool] of Object.entries(tools)) {
    if (name.includes('list')) {
      toolSet[name] = tool;
    }
  }

  return {
    client,
    toolSet,
  };
}
