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
  create: Record<string, MCPTool>;
  update: Record<string, MCPTool>;
  delete: Record<string, MCPTool>;
};

export async function getTablesTools(): Promise<ToolSet> {
  const { token } = await authenticateDefaultUserInOpenOpsTables();
  logger.info(
    {
      token,
    },
    'Getting MCP endpoints from OpenOps tables',
  );
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

  const tools = await client.tools();

  const registry: MCPRegistry = {
    list: {},
    create: {},
    update: {},
    delete: {},
  };

  const opMap: Record<string, keyof MCPRegistry> = {
    list_rows: 'list',
    create_row: 'create',
    update_row: 'update',
    delete_row: 'delete',
  };

  for (const [key, mcpTool] of Object.entries(tools)) {
    const match = key.match(
      /(list_rows|create_row|update_row|delete_row)_table_(\d+)/,
    );
    if (!match) continue;

    const [, mcpOp, tableId] = match;
    const op = opMap[mcpOp];
    if (!op) continue;

    if (op === 'create') {
      // Try extracting schema metadata
      // @ts-ignore
      const jsonSchema = mcpTool.parameters?.jsonSchema;
      const fields = jsonSchema?.properties?.row?.properties
        ? Object.keys(jsonSchema.properties.row.properties)
        : [];

      // @ts-ignore
      registry.create[tableId] = { tool: mcpTool, fields };
    } else {
      // @ts-ignore
      registry[op][tableId] = mcpTool;
    }
  }
  logger.info(registry, 'Tables tools Registry');

  const toolSet: ToolSet = {};

  // List Tables Tool
  const listTablesTool = tools['list_tables'];
  if (listTablesTool) {
    toolSet.listTables = tools['list_tables'];
  }

  // List Rows Tool
  toolSet.listRowsTable = tool({
    description: 'List rows from a specific OpenOps table by table ID.',
    parameters: z.object({
      tableId: z
        .string()
        .describe('The numeric table ID (e.g., "1", "2", "8")'),
      page: z
        .number()
        .default(1)
        .describe('Pagination page number (default: 1)'),
      size: z
        .number()
        .default(100)
        .describe('Number of rows per page (default: 100)'),
      search: z
        .string()
        .optional()
        .describe('Optional search term to filter results'),
    }),
    execute: async ({ tableId, ...rest }) => {
      const tool = registry.list[tableId];
      if (!tool)
        throw new Error(
          `No list_rows_table tool found for table ID: ${tableId}`,
        );
      return tool.execute(
        { ...rest },
        { toolCallId: openOpsId(), messages: [] },
      );
    },
  });

  // const createRowFields = Object.entries(registry.create).reduce(
  //   (acc, [tableId, entry]) => {
  //     // @ts-ignore
  //     acc[tableId] = entry.fields?.slice(0, 5).join(', ') || '(no fields)';
  //     return acc;
  //   },
  //   {} as Record<string, string>,
  // );

  toolSet.createRowTable = tool({
    description: `Insert a new row into a table using its ID. Example:
        "args": {
        "row": {
          "Estimated savings USD per month": "100.00",
          "Resource Id": "i-0abc123xyz",
          "Workflow": "Idle EC2 Workflow",
          "Service": "EC2",
          "Region": "us-east-1",
          "Account": "123456789012",
          "Owner": "jane.doe@company.com",
          "Follow-up task": "Confirm resource ownership",
          "Opportunity generator": "EC2 Idle Scanner",
          "External Opportunity Id": "ext-op-12345",
          "Opportunity details": "Instance has been idle for 14+ days",
          "Snoozed until": "2024-01-01T00:00:00Z",
          "Resolution notes": "Pending owner confirmation"
        }
    }`,
    parameters: z.object({
      tableId: z
        .string()
        .describe('The numeric table ID (e.g., "6", "2", "8").'),
      row: z.record(z.any()).describe(
        `Required. Object of fields to insert. ${Object.entries(registry.create)
          .map(([tableId, entry]) =>
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            {
              /* eslint-disable-next-line @typescript-eslint/ban-ts-comment*/
              /* @ts-ignore*/
              return `Table ${tableId}: ${entry.fields.join(', ')}`;
            },
          )
          .join('\n')}`,
      ),
    }),
    execute: async ({ tableId, row }) => {
      const entry = registry.create[tableId];
      if (!entry)
        throw new Error(
          `No create_row_table tool found for table ID: ${tableId}`,
        );

      // @ts-ignore
      const { tool: createTool, fields: knownFields } = entry;

      if (!row || typeof row !== 'object') {
        throw new Error(
          `Missing required 'row'. Must be a key-value object of column names. Known fields: ${knownFields.join(
            ', ',
          )}`,
        );
      }

      // const invalidKeys = Object.keys(row).filter(
      //   (k) => !knownFields.includes(k),
      // );
      // if (invalidKeys.length > 0) {
      //   throw new Error(
      //     `Invalid fields: ${invalidKeys.join(
      //       ', ',
      //     )}. Valid fields for table ${tableId}: ${knownFields.join(', ')}`,
      //   );
      // }

      return createTool.execute(
        { row },
        { toolCallId: openOpsId(), messages: [] },
      );
    },
  });

  // Update Row Tool
  toolSet.updateRowTable = tool({
    description: 'Update a row in a table. Provide the table ID and row ID.',
    parameters: z.object({
      tableId: z
        .string()
        .describe('The numeric table ID (e.g., "1", "2", "8")'),
      rowId: z
        .union([z.string(), z.number()])
        .describe('ID of the row to update'),
      fields: z
        .record(z.any())
        .describe('Field values to update. Must match the table schema.'),
    }),
    execute: async ({ tableId, rowId, fields }) => {
      const tool = registry.update[tableId];
      if (!tool)
        throw new Error(
          `No update_row_table tool found for table ID: ${tableId}`,
        );
      return tool.execute(
        { id: rowId, row: fields },
        { toolCallId: openOpsId(), messages: [] },
      );
    },
  });

  // Delete Row Tool
  toolSet.deleteRowTable = tool({
    description: 'Delete a row from a table using its table ID and row ID.',
    parameters: z.object({
      tableId: z
        .string()
        .describe('The numeric table ID (e.g., "1", "2", "8")'),
      rowId: z
        .union([z.string(), z.number()])
        .describe('ID of the row to delete'),
    }),
    execute: async ({ tableId, rowId }) => {
      const tool = registry.delete[tableId];
      if (!tool)
        throw new Error(
          `No delete_row_table tool found for table ID: ${tableId}`,
        );
      return tool.execute(
        { id: rowId },
        { toolCallId: openOpsId(), messages: [] },
      );
    },
  });

  logger.info(toolSet, 'Wrapper tables toolSet');

  return toolSet;
  // return client.tools();
}
