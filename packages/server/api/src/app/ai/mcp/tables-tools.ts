import {
  authenticateDefaultUserInOpenOpsTables,
  createAxiosHeaders,
} from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { openOpsId } from '@openops/shared';
import {
  experimental_createMCPClient as createMCPClient,
  Tool,
  tool,
  ToolSet,
} from 'ai';
import { z } from 'zod';
import { openopsTables } from '../../openops-tables';

type MCPTool = Tool & { execute: (...args: unknown[]) => Promise<unknown> };

type MCPRegistry = {
  list: Record<string, MCPTool>;
};

export async function getTablesTools(): Promise<ToolSet> {
  const { token } = await authenticateDefaultUserInOpenOpsTables();
  const mcpEndpoint = await openopsTables.getMcpEndpointList(token);
  if (!mcpEndpoint) return {};

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

  const registry: MCPRegistry = {
    list: {},
  };

  const operationMap: Record<string, keyof MCPRegistry> = {
    list_rows: 'list',
  };

  for (const [key, mcpTool] of Object.entries(tools)) {
    const match = key.match(/(list_rows)_table_(\d+)/);
    if (!match) continue;

    const [, mcpOp, tableId] = match;
    const op = operationMap[mcpOp];
    if (!op) continue;

    if (tableId && op === 'list') {
      registry.list[tableId] = mcpTool as MCPTool;
    }
  }

  const toolSet: ToolSet = {};

  // List Tables Tool
  const listTablesTool = tools['list_tables'];
  if (listTablesTool) {
    toolSet.listTables = listTablesTool;
  }

  // List Rows Tool
  if (registry.list) {
    toolSet.listRowsTable = tool({
      description: 'List rows from a specific OpenOps table by table ID.',
      parameters: z.object({
        tableId: z
          .string()
          .describe(`Table ID, e.g., ${Object.keys(registry.list).join(', ')}`),
        page: z
          .number()
          .default(1)
          .describe('Pagination page number (default: 1)'),
        size: z.number().default(100).describe('Number of rows per page'),
        search: z.string().optional().describe('Optional search filter'),
      }),
      execute: async ({ tableId, ...rest }) => {
        const listTool = registry.list[tableId];
        if (!listTool) {
          throw new Error(`No list_rows_table tool for table ${tableId}`);
        }
        return listTool.execute(
          { ...rest },
          { toolCallId: openOpsId(), messages: [] },
        );
      },
    });
  }

  logger.debug(
    {
      TableTools: toolSet,
    },
    'Registered table tools',
  );
  return toolSet;
}
