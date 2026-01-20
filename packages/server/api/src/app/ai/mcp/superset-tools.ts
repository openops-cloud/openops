import { createMCPClient } from '@ai-sdk/mcp';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { AppSystemProp, system } from '@openops/server-shared';
import path from 'path';
import { MCPTool } from './types';

export async function getSupersetTools(): Promise<MCPTool> {
  if (!system.isAnalyticsEnabled()) {
    return {
      client: undefined,
      toolSet: {},
    };
  }

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

  const supersetClient = await createMCPClient({
    transport: new StdioClientTransport({
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
    toolSet[key] = {
      ...tool,
      toolProvider: 'superset',
    };
  }

  return {
    client: supersetClient,
    toolSet,
  };
}
