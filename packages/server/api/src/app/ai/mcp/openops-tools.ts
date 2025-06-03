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
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { MCPTool } from './mcp-tools';

let cachedSchemaPath: string | undefined;

async function getOpenApiSchemaPath(app: FastifyInstance): Promise<string> {
  logger.info('Retrieving OpenAPI schema path');
  if (!cachedSchemaPath) {
    const openApiSchema = app.swagger();
    cachedSchemaPath = path.join(os.tmpdir(), 'openapi-schema.json');
    await fs.writeFile(
      cachedSchemaPath,
      JSON.stringify(openApiSchema),
      'utf-8',
    );
    logger.info('Writing OpenAPI schema to:', {
      cachedSchemaPath,
      schema: JSON.stringify(openApiSchema),
    });
  }
  return cachedSchemaPath;
}

export async function getOpenOpsTools(
  app: FastifyInstance,
  authToken: string,
): Promise<MCPTool> {
  logger.info('Creating OpenOps MCP client');
  const basePath = system.getOrThrow<string>(
    AppSystemProp.OPENOPS_MCP_SERVER_PATH,
  );
  const apiBaseUrl = networkUtls.getInternalApiUrl();
  const logzioToken = system.get<string>(SharedSystemProp.LOGZIO_TOKEN);

  const pythonPath = path.join(basePath, '.venv', 'bin', 'python');
  const serverPath = path.join(basePath, 'main.py');

  const tempSchemaPath = await getOpenApiSchemaPath(app);

  try {
    logger.info('Initializing OpenOps MCP client with Python path:', {
      pythonPath,
    });
    const openopsClient = await experimental_createMCPClient({
      transport: new Experimental_StdioMCPTransport({
        command: pythonPath,
        args: [serverPath],
        env: {
          OPENAPI_SCHEMA_PATH: tempSchemaPath,
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
    logger.info('Finished Initializing');
    return {
      client: openopsClient,
      toolSet: await openopsClient.tools(),
    };
  } catch (error) {
    logger.error('Failed to create OpenOps MCP client:', {
      error: error instanceof Error ? error.message : String(error),
      apiBaseUrl,
    });
    return {
      client: undefined,
      toolSet: {},
    };
  }
}
