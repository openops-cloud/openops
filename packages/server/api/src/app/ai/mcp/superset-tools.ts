import { AppSystemProp, system } from '@openops/server-shared';
import { experimental_createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/dist/mcp-stdio';
import path from 'path';
import { MCPTool } from './types';

export async function getSupersetTools(): Promise<MCPTool> {
  const basePath = system.get<string>(AppSystemProp.SUPERSET_MCP_SERVER_PATH);

  if (!basePath) {
    return {
      client: undefined,
      toolSet: {},
    };
  }

  const pythonPath = path.join(basePath, '.venv', 'bin', 'python');
  const serverPath = path.join(basePath, 'main.py');

  const baseUrl =
    system.get(AppSystemProp.ANALYTICS_PRIVATE_URL) + '/openops-analytics';
  const password = system.getOrThrow(AppSystemProp.ANALYTICS_ADMIN_PASSWORD);

  const supersetClient = await experimental_createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: pythonPath,
      args: [serverPath],
      env: {
        SUPERSET_BASE_URL: baseUrl,
        SUPERSET_USERNAME: 'admin',
        SUPERSET_PASSWORD: password,
      },
    }),
  });

  const tools = await supersetClient.tools();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolSet: Record<string, any> = {};
  for (const [key, tool] of Object.entries(tools)) {
    const toolWithProvider = tool as typeof tool & { toolProvider: string };
    toolWithProvider.toolProvider = 'superset';
    toolSet[key] = toolWithProvider;
  }

  return {
    client: supersetClient,
    toolSet,
  };
}
