import { AppSystemProp, logger, system } from '@openops/server-shared';
import {
  experimental_createMCPClient as createMCPClient,
  tool,
  ToolSet,
} from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';
import { z } from 'zod';

export async function getDocsTools(): Promise<ToolSet> {
  const mcpServerPath = system.get<string>(AppSystemProp.DOCS_MCP_SERVER_PATH);
  if (!mcpServerPath) {
    return Promise.resolve({});
  }

  logger.debug('Creating MCP client for docs', {
    serverPath: mcpServerPath,
  });

  const client = await createMCPClient({
    transport: new StdioMCPTransport({
      command: 'node',
      args: [mcpServerPath],
    }),
  });

  const tools = await client.tools();
  const searchTool = tools['search'];

  const toolSet = {
    docsMcpClient: tool({
      description: 'Search OpenOps documentation',
      parameters: z.object({
        query: z.string().describe('The search query'),
      }),
      execute: async ({ query }) => {
        try {
          if (!searchTool || typeof searchTool.execute !== 'function') {
            return await Promise.resolve({
              success: false,
              error: 'search tool not available',
            });
          }

          const result = await searchTool.execute(
            { query },
            { toolCallId: '', messages: [] },
          );
          return result;
        } catch (error) {
          logger.error('docsMcpClient error:', error);
          return Promise.resolve({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    }),
  };

  return toolSet;
}
