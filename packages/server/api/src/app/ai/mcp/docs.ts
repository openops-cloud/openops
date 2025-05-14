import { AppSystemProp, logger, system } from '@openops/server-shared';
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';

const DOCS_MCP_SERVER_PATH =
  system.get<string>(AppSystemProp.DOCS_MCP_SERVER_PATH) ||
  '/root/.mcp/docs.openops.com';

let cachedDocsMcpClient: Awaited<ReturnType<typeof createMCPClient>> | null =
  null;

export async function getDocsMcpClient(): ReturnType<typeof createMCPClient> {
  logger.debug(DOCS_MCP_SERVER_PATH, 'DOCS_MCP_SERVER_PATH');

  if (cachedDocsMcpClient) return cachedDocsMcpClient;
  cachedDocsMcpClient = await createMCPClient({
    transport: new StdioMCPTransport({
      command: 'node',
      args: [DOCS_MCP_SERVER_PATH],
    }),
  });
  return cachedDocsMcpClient;
}
