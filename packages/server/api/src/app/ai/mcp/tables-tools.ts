import { createAxiosHeaders } from '@openops/common';
import { AppSystemProp, system } from '@openops/server-shared';
import { isEmpty } from '@openops/shared';
import { experimental_createMCPClient as createMCPClient, ToolSet } from 'ai';
import { openopsTables } from '../../openops-tables';
import { authenticateAdminUserInOpenOpsTables } from '../../openops-tables/auth-admin-tables';
import { MCPTool } from './types';

export async function getTablesTools(): Promise<MCPTool> {
  const { token } = await authenticateAdminUserInOpenOpsTables();
  const mcpEndpoint = await openopsTables.getMcpEndpointList(token);
  if (isEmpty(mcpEndpoint)) {
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
