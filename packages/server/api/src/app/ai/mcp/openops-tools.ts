import {
  AppSystemProp,
  logger,
  networkUtls,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import { experimental_createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { FastifyInstance } from 'fastify';
import path from 'path';
import { MCPTool } from './mcp-tools';

export async function getOpenOpsTools(
  app: FastifyInstance,
  authToken: string,
): Promise<MCPTool> {
  const basePath = system.getOrThrow<string>(
    AppSystemProp.OPENOPS_MCP_SERVER_PATH,
  );

  const pythonPath = path.join(basePath, '.venv', 'bin', 'python');
  const serverPath = path.join(basePath, 'main.py');

  const openApiSchema = app.swagger();

  try {
    const openopsClient = await experimental_createMCPClient({
      transport: new Experimental_StdioMCPTransport({
        command: pythonPath,
        args: [serverPath],
        env: {
          OPENAPI_SCHEMA: JSON.stringify(openApiSchema),
          AUTH_TOKEN: authToken,
          API_BASE_URL: networkUtls.getInternalApiUrl(),
          OPENOPS_MCP_SERVER_PATH: basePath,
          LOGZIO_TOKEN: system.get<string>(SharedSystemProp.LOGZIO_TOKEN) ?? '',
          ENVIRONMENT:
            system.get<string>(SharedSystemProp.ENVIRONMENT_NAME) ?? '',
        },
      }),
    });

    return {
      client: openopsClient,
      toolSet: await openopsClient.tools(),
    };
  } catch (error) {
    logger.error('Failed to create OpenOps MCP client:', error);
    return {
      client: undefined,
      toolSet: {},
    };
  }
}
