import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { tool } from 'ai';
import { z } from 'zod';
import { MCPTool } from './types';

type MCPSearchTool = {
  execute: (
    args: { query: string },
    options: { toolCallId: string; messages: unknown[] },
  ) => Promise<unknown>;
};

type MCPHttpTransport = {
  type: 'http';
  url: string;
};

export async function getDocsTools(): Promise<MCPTool> {
  const mcpServerUrl = system.get<string>(AppSystemProp.DOCS_MCP_SERVER_PATH);
  if (!mcpServerUrl) {
    return {
      client: undefined,
      toolSet: {},
    };
  }

  logger.debug('Creating MCP client for docs', {
    serverPath: mcpServerUrl,
  });

  const client = await createMCPClient({
    transport: {
      type: 'http',
      url: mcpServerUrl,
    } as MCPHttpTransport,
  });

  const tools = await client.tools();
  const toolsObject = tools instanceof Map ? Object.fromEntries(tools) : tools;

  const searchToolName = Object.keys(toolsObject).find((name) =>
    name.toLowerCase().includes('search'),
  );
  const searchTool = searchToolName
    ? (toolsObject[searchToolName] as MCPSearchTool)
    : undefined;

  if (!searchTool?.execute) {
    logger.error('Docs MCP search tool not available', {
      availableTools: Object.keys(toolsObject),
    });
  }

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
        if (!searchTool?.execute) {
          return { success: false, error: 'search tool not available' };
        }

        try {
          return await searchTool.execute(
            { query },
            { toolCallId: '', messages: [] },
          );
        } catch (error) {
          logger.error('OpenOps Documentation MCP client error:', { error });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),
  };

  return {
    client,
    toolSet,
  };
}
