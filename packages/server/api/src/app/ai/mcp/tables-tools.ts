import {
  authenticateDefaultUserInOpenOpsTables,
  createAxiosHeaders,
} from '@openops/common';
import { AppSystemProp, system } from '@openops/server-shared';
import { experimental_createMCPClient as createMCPClient, ToolSet } from 'ai';
import { openopsTables } from '../../openops-tables';

export async function getTablesTools(): Promise<ToolSet> {
  const { token } = await authenticateDefaultUserInOpenOpsTables();
  const mcpEndpoint = await openopsTables.getMcpEndpointList(token);

  if (!mcpEndpoint) {
    return {};
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

  return client.tools();
}
