import { AppSystemProp, system } from '@openops/server-shared';
import { experimental_createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import path from 'path';
import { MCPTool } from './mcp-tools';

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

  return {
    client: supersetClient,
    toolSet: await supersetClient.tools(),
  };
}
