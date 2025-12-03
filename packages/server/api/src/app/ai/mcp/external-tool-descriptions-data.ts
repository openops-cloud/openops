export const MCP_TOOL_ADDITIONAL_DESCRIPTIONS: Record<string, string> = {
  'session-sql': `## IMPORTANT: Tool Usage Note for 'session-sql'
  
  The 'session-sql' tool from AWS billing and cost management MCP server does NOT work with OpenOps tables.
  
  When the user asks about OpenOps tables, database schema, or table operations, DO NOT use 'session-sql'. This tool is only for AWS billing and cost management related SQL queries.`,
};
