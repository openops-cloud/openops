import { AppSystemProp, system } from '@openops/server-shared';
import { experimental_createMCPClient, ToolSet } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import path from 'path';

export async function getSupersetTools(): Promise<ToolSet> {
  const basePath = system.get<string>(AppSystemProp.SUPERSET_MCP_SERVER_PATH);

  if (!basePath) {
    return {};
  }

  const pythonPath = path.join(basePath, '.venv', 'bin', 'python');
  const serverPath = path.join(basePath, 'main.py');

  const supersetClient = await experimental_createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: pythonPath,
      args: [serverPath],
    }),
  });

  return supersetClient.tools();
}
