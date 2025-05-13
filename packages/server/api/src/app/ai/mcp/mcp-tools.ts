import { logger } from '@openops/server-shared';
import {
  experimental_createMCPClient as createMCPClient,
  Tool,
  tool,
} from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';

import { z } from 'zod';

const DOCS_MCP_SERVER_PATH =
  process.env.DOCS_MCP_SERVER_PATH || '/root/.mcp/docs.openops.com';

export const getMCPTool = (toolName: string): Tool => {
  const tool = getMCPTools()[toolName];
  if (!tool) {
    throw new Error(`Tool '${toolName}' not found.`);
  }
  return tool;
};

export const getMCPTools = (): Record<string, Tool> => ({
  docsMcpClient: tool({
    description:
      'Search OpenOps documentation using the MCP tool (persistent long-running process)',
    parameters: z.object({
      query: z.string().describe('The search query'),
    }),
    execute: async ({ query }) => {
      try {
        const client = await createMCPClient({
          transport: new StdioMCPTransport({
            command: 'node',
            args: [DOCS_MCP_SERVER_PATH],
          }),
        });
        const tools = await client.tools();

        const searchTool = tools['search'];
        if (!searchTool || typeof searchTool.execute !== 'function') {
          throw new Error('search tool not available');
        }

        const result = await searchTool.execute(
          { query },
          { toolCallId: '', messages: [] },
        );
        return result;
      } catch (error) {
        logger.error('Persistent docsMcpClient error:', error);
        throw new Error(
          `Persistent docsMcpClient failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    },
  }),
});
