import {
  AppSystemProp,
  logger,
  networkUtls,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import { experimental_createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { exec } from 'child_process';
import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { MCPTool } from './mcp-tools';

let cachedSchemaPath: string | undefined;

async function getOpenApiSchemaPath(app: FastifyInstance): Promise<string> {
  logger.info('[OPENOPS TOOLS]Retrieving OpenAPI schema path');
  if (!cachedSchemaPath) {
    const openApiSchema = app.swagger();
    cachedSchemaPath = path.join(os.tmpdir(), 'openapi-schema.json');
    await fs.writeFile(
      cachedSchemaPath,
      JSON.stringify(openApiSchema),
      'utf-8',
    );
    logger.info('[OPENOPS TOOLS]First time writing OpenAPI schema to:', {
      cachedSchemaPath,
      schema: JSON.stringify(openApiSchema),
    });
  }
  logger.info('[OPENOPS TOOLS] Returning cached OpenAPI schema path:', {
    cachedSchemaPath,
  });
  return cachedSchemaPath;
}

export async function getOpenOpsTools(
  app: FastifyInstance,
  authToken: string,
): Promise<MCPTool> {
  logger.info('[OPENOPS TOOLS] Creating OpenOps MCP client');
  const basePath = system.getOrThrow<string>(
    AppSystemProp.OPENOPS_MCP_SERVER_PATH,
  );
  const apiBaseUrl = networkUtls.getInternalApiUrl();
  const logzioToken = system.get<string>(SharedSystemProp.LOGZIO_TOKEN);

  const pythonPath = path.join(basePath, '.venv', 'bin', 'python');
  const serverPath = path.join(basePath, 'main.py');

  const tempSchemaPath = await getOpenApiSchemaPath(app);
  logger.info('[OPENOPS TOOLS] Temp schema path:', {
    tempSchemaPath,
  });
  try {
    logger.info(
      '[OPENOPS TOOLS] Initializing OpenOps MCP client with Python path:',
      {
        pythonPath,
        basePath,
        venvExists: await fs
          .access(pythonPath)
          .then(() => true)
          .catch(() => false),
        serverExists: await fs
          .access(serverPath)
          .then(() => true)
          .catch(() => false),
      },
    );

    // Log environment variables (excluding sensitive ones)
    const envVars = {
      OPENAPI_SCHEMA_PATH: tempSchemaPath,
      API_BASE_URL: apiBaseUrl,
      OPENOPS_MCP_SERVER_PATH: basePath,
      ENVIRONMENT: system.get<string>(SharedSystemProp.ENVIRONMENT_NAME) ?? '',
      LOGZIO_TOKEN_EXISTS: !!logzioToken,
      AUTH_TOKEN_EXISTS: !!authToken,
    };
    logger.info('[OPENOPS TOOLS] Environment variables:', envVars);

    // Check Python version and virtual environment
    try {
      const pythonVersion = await new Promise<string>((resolve) => {
        exec(
          `${pythonPath} --version`,
          (error: Error | null, stdout: string) => {
            if (error) {
              logger.error(
                '[OPENOPS TOOLS] Failed to get Python version:',
                error,
              );
              resolve('unknown');
            } else {
              resolve(stdout.trim());
            }
          },
        );
      });
      logger.info('[OPENOPS TOOLS] Python version:', { pythonVersion });
    } catch (error) {
      logger.error('[OPENOPS TOOLS] Error checking Python version:', error);
    }

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
    logger.info('[OPENOPS TOOLS] Finished Initializing');
    return {
      client: openopsClient,
      toolSet: await openopsClient.tools(),
    };
  } catch (error) {
    logger.error('[OPENOPS TOOLS] Failed to create OpenOps MCP client:', {
      error: error instanceof Error ? error.message : String(error),
      apiBaseUrl,
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : undefined,
    });
    return {
      client: undefined,
      toolSet: {},
    };
  }
}
