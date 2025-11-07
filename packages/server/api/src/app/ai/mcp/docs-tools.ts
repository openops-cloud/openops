import { AppSystemProp, logger, system } from '@openops/server-shared';
import { experimental_createMCPClient as createMCPClient, tool } from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';
import { z } from 'zod';
import { MCPTool } from './types';

export async function getDocsTools(): Promise<MCPTool> {
  const mcpServerPath = system.get<string>(AppSystemProp.DOCS_MCP_SERVER_PATH);
  if (!mcpServerPath) {
    return {
      client: undefined,
      toolSet: {},
    };
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
    OpenOps_Documentation: tool({
      description: `Search OpenOps documentation for information about platform features, integrations, blocks, or templates.
IMPORTANT USAGE GUIDELINES:
- ALWAYS use this tool when users ask about OpenOps platform features, integrations, blocks, or templates
- When providing documentation links in responses, ensure they start with https://docs.openops.com/ in valid markdown format
- Only provide links when contextually appropriate (e.g., don't provide links if user asks for code generation)
- IMPORTANT: NEVER suggest documentation links without first using this tool to verify they exist
- IMPORTANT: NEVER create or guess documentation URLs - only provide links that are explicitly returned by this tool
Use this tool to find accurate, verified information before answering OpenOps-specific questions.`,
      inputSchema: z.object({
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
          logger.error('OpenOps Documentation MCP client error:', { error });
          return Promise.resolve({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    }),
  };

  return {
    client,
    toolSet,
  };
}
