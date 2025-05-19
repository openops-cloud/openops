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
import { zodToJsonSchema } from 'zod-to-json-schema';
import { openopsTables } from '../../openops-tables';
import { jsonSchemaToZod } from './helpers/json-schema';

// import { JSONSchema, jsonSchemaToZodObject } from './helpers/json-schema';

type MCPTool = Tool & { execute: (...args: unknown[]) => Promise<unknown> };

type MCPRegistry = {
  list: Record<string, MCPTool>;
  create: Record<string, { zodRowSchema: z.ZodTypeAny; tool: MCPTool }>;
  update: Record<string, { zodRowSchema: z.ZodTypeAny; tool: MCPTool }>;
  delete: Record<string, MCPTool>;
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

    if (mcpOp === 'create_row') {
      registry.create[tableId] = {
        zodRowSchema: jsonSchemaToZod(
          // @ts-expect-error - mcpTool type inference isn't accurate
          mcpTool.parameters.jsonSchema.properties.row,
        ),
        // @ts-ignore
        tool: mcpTool,
      };
    } else {
      // @ts-expect-error - mcpTool type inference isn't accurate
      registry[op][tableId] = mcpTool;
    }
  }

  const toolSet: ToolSet = {};

  // List Tables Tool
  const listTablesTool = tools['list_tables'];
  if (listTablesTool) {
    toolSet.listTables = listTablesTool;
  }

  // List Rows Tool
  toolSet.listRowsTable = tool({
    description: 'List rows from a specific OpenOps table by table ID.',
    parameters: z.object({
      tableId: z.string().describe('Table ID (e.g., "1", "2", "8")'),
      page: z
        .number()
        .default(1)
        .describe('Pagination page number (default: 1)'),
      size: z.number().default(100).describe('Number of rows per page'),
      search: z.string().optional().describe('Optional search filter'),
    }),
    execute: async ({ tableId, ...rest }) => {
      const listTool = registry.list[tableId];
      if (!listTool)
        throw new Error(`No list_rows_table tool for table ${tableId}`);
      return listTool.execute(
        { ...rest },
        { toolCallId: openOpsId(), messages: [] },
      );
    },
  });

  logger.debug('Registry create contents:', Object.keys(registry.create));

  // Create a general purpose tool if any tables exist
  // Use specific table tools (createRowTable_X) for proper schema. See schema for available tables: ${JSON.stringify(
  //       registry.create,
  //     )}

  const createRowSchemas = Object.entries(registry.create)
    .map(([tableId, entry]) => {
      const schema = entry.zodRowSchema;

      if (!schema || schema._def.typeName !== 'ZodObject') {
        logger.warn(`Invalid zodRowSchema for table ${tableId}`);
        return null;
      }

      const jsonSchema = zodToJsonSchema(schema);
      logger.info(
        {
          jsonSchema,
        },
        `jsonSchema for table ${tableId}`,
      );

      return z
        .object({
          tableId: z.literal(tableId),
          row: schema,
        })
        .describe(
          `Create row in table ${tableId}`,
        ) as z.ZodDiscriminatedUnionOption<'tableId'>;
    })
    .filter(Boolean); // remove nulls

  if (createRowSchemas.length > 0) {
    // @ts-ignore
    const createRowSchema = z.discriminatedUnion('tableId', createRowSchemas);
    const jsonSchema = zodToJsonSchema(createRowSchema);
    logger.info(
      {
        jsonSchema,
      },
      `jsonSchema for all`,
    );

    toolSet.createRowTable = tool({
      description:
        'Create a row in a table by specifying the table and structured row data.',
      parameters: createRowSchema,
      execute: async ({ tableId, row }) => {
        // @ts-ignore
        const entry = registry.create[tableId];
        if (!entry) throw new Error(`No tool found for table ${tableId}`);
        return entry.tool.execute(
          { row },
          { toolCallId: openOpsId(), messages: [] },
        );
      },
    });
  } else {
    logger.warn(
      'No valid schemas found for createRowTable. Tool not registered.',
    );
  }

  // Update Row Tool
  // toolSet.updateRowTable = tool({
  //   description: `Update a row by table and row ID. Use specific table tools (updateRowTable_X) for proper schema. See schema for available tables: ${JSON.stringify(
  //     registry.update,
  //   )}`,
  //   parameters: z.object({
  //     tableId: z.string().describe('Table ID'),
  //     rowId: z.union([z.string(), z.number()]).describe('Row ID'),
  //     fields: z.record(z.any()).describe('Fields to update'),
  //   }),
  //   execute: async ({ tableId, rowId, fields }) => {
  //     const updateTool = registry.update[tableId];
  //     if (!updateTool)
  //       throw new Error(`No update_row_table tool for table ${tableId}`);
  //     return updateTool.execute(
  //       { id: rowId, row: fields },
  //       { toolCallId: openOpsId(), messages: [] },
  //     );
  //   },
  // });

  // Delete Row Tool
  toolSet.deleteRowTable = tool({
    description: 'Delete a row from a table.',
    parameters: z.object({
      tableId: z.string().describe('Table ID'),
      rowId: z.union([z.string(), z.number()]).describe('Row ID'),
    }),
    execute: async ({ tableId, rowId }) => {
      const deleteTool = registry.delete[tableId];
      if (!deleteTool)
        throw new Error(`No delete_row_table tool for table ${tableId}`);
      return deleteTool.execute(
        { id: rowId },
        { toolCallId: openOpsId(), messages: [] },
      );
    },
  });

  logger.info(toolSet, 'Final registered toolset');
  return toolSet;

  // return tools;
}
