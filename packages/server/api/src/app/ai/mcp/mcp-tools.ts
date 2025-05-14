import { logger } from '@openops/server-shared';
import { Tool, tool } from 'ai';

import { z } from 'zod';
import { getDocsMcpClient } from './docs';

export const getMCPTool = (toolName: string): Tool => {
  const tool = getMCPTools()[toolName];
  if (!tool) {
    throw new Error(`Tool '${toolName}' not found.`);
  }
  return tool;
};

export const getMCPTools = (): Record<string, Tool> => ({
  docsMcpClient: tool({
    description: 'Search OpenOps documentation using the MCP tool',
    parameters: z.object({
      query: z.string().describe('The search query'),
    }),
    execute: async ({ query }) => {
      try {
        const client = await getDocsMcpClient();
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
        return Promise.resolve({
          error: true,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  }),
});
