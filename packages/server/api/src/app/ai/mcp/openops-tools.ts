import swagger from '@fastify/swagger';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { experimental_createMCPClient, ToolSet } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { FastifyInstance } from 'fastify';
import path from 'path';

let openopsClient: any = null;

export async function getOpenOpsTools(app: FastifyInstance): Promise<ToolSet> {
  const basePath = system.get<string>(AppSystemProp.OPENOPS_MCP_SERVER_PATH);

  if (!basePath) {
    return {};
  }

  // If client already exists, return its tools
  if (openopsClient) {
    return openopsClient.tools();
  }

  const pythonPath = path.join(basePath, '.venv', 'bin', 'python');
  const serverPath = path.join(basePath, 'main.py');

  const openApiSchema = app.swagger();
  logger.info(`OpenAPI schema: ${JSON.stringify(openApiSchema)}`);

  try {
    openopsClient = await experimental_createMCPClient({
      transport: new Experimental_StdioMCPTransport({
        command: pythonPath,
        args: [serverPath],
        env: {
          OPENAPI_SCHEMA: JSON.stringify(openApiSchema),
        },
      }),
    });

    // Wait a moment to ensure the client is fully initialized
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return openopsClient.tools();
  } catch (error) {
    logger.error('Failed to create OpenOps MCP client:', error);
    return {};
  }
}
