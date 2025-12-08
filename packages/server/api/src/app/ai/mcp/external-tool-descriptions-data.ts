export type ToolDescription = {
  note: string;
  mcpServer?: string;
};

export const MCP_TOOL_ADDITIONAL_DESCRIPTIONS: Record<string, ToolDescription> =
  {
    'session-sql': {
      note: `### Tool Usage Note for 'session-sql'
- The 'session-sql' tool from AWS billing and cost management MCP server does NOT work with OpenOps tables.
- When the user asks about OpenOps tables, table schema, or table operations, DO NOT use 'session-sql'. 
- This tool is only for AWS billing and cost management related SQL queries.`,
      mcpServer: 'aws-billing-cost-management',
    },
  };
