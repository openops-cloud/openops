import {
  AppSystemProp,
  logger,
  networkUtls,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import { experimental_createMCPClient, ToolSet } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { FastifyInstance } from 'fastify';
import path from 'path';

let openopsClient = null;

export async function getOpenOpsTools(
  app: FastifyInstance,
  authToken: string,
): Promise<ToolSet> {
  const basePath = system.get<string>(AppSystemProp.OPENOPS_MCP_SERVER_PATH);
  const apiBaseUrl = networkUtls.getInternalApiUrl();
  const logzioToken = system.get<string>(SharedSystemProp.LOGZIO_TOKEN);

  if (!basePath) {
    logger.warn('OPENOPS_MCP_SERVER_PATH not set');
    return {};
  }

  const pythonPath = path.join(basePath, '.venv', 'bin', 'python');
  const serverPath = path.join(basePath, 'main.py');

  const openApiSchema = app.swagger();

  try {
    openopsClient = await experimental_createMCPClient({
      transport: new Experimental_StdioMCPTransport({
        command: pythonPath,
        args: [serverPath],
        env: {
          OPENAPI_SCHEMA: JSON.stringify(openApiSchema),
          AUTH_TOKEN: authToken,
          API_BASE_URL: apiBaseUrl,
          OPENOPS_MCP_SERVER_PATH: basePath,
          LOGZIO_TOKEN: logzioToken ?? '',
          ENVIRONMENT:
            system.get<string>(SharedSystemProp.ENVIRONMENT_NAME) ?? '',
        },
      }),
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return await openopsClient.tools();
  } catch (error) {
    logger.error('Failed to create OpenOps MCP client:', error);
    return {};
  }
}
