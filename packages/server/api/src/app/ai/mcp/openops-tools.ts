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
  logger.info('[OPENOPS TOOLS] Retrieving OpenAPI schema path');
  if (!cachedSchemaPath) {
    const openApiSchema = app.swagger();
    const tempPath = path.join(os.tmpdir(), 'openapi-schema.json');
    try {
      await fs.writeFile(tempPath, JSON.stringify(openApiSchema), 'utf-8');
      await fs.access(tempPath);
      cachedSchemaPath = tempPath;
      logger.info('[OPENOPS TOOLS] Successfully wrote OpenAPI schema to:', {
        cachedSchemaPath,
      });
    } catch (error) {
      logger.error('[OPENOPS TOOLS] Failed to write OpenAPI schema:', {
        error: error instanceof Error ? error.message : String(error),
        tempPath,
      });
      throw new Error('Failed to write OpenAPI schema file');
    }
  } else {
    try {
      await fs.access(cachedSchemaPath);
      logger.info('[OPENOPS TOOLS] Using existing OpenAPI schema at:', {
        cachedSchemaPath,
      });
    } catch (error) {
      logger.warn(
        '[OPENOPS TOOLS] Cached schema file not found, regenerating:',
        {
          cachedSchemaPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      cachedSchemaPath = undefined;
      return getOpenApiSchemaPath(app);
    }
  }
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

      // Test Python environment and imports
      const testCommand = `${pythonPath} -c "import sys; import json; import httpx; import fastmcp; print('Python environment OK')"`;
      try {
        const testResult = await new Promise<string>((resolve, reject) => {
          exec(
            testCommand,
            (error: Error | null, stdout: string, stderr: string) => {
              if (error) {
                logger.error(
                  '[OPENOPS TOOLS] Python environment test failed:',
                  {
                    error: error.message,
                    stderr,
                  },
                );
                reject(error);
              } else {
                resolve(stdout.trim());
              }
            },
          );
        });
        logger.info('[OPENOPS TOOLS] Python environment test:', {
          result: testResult,
        });
      } catch (error) {
        logger.error(
          '[OPENOPS TOOLS] Python environment verification failed:',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        throw new Error('Python environment verification failed');
      }
    } catch (error) {
      logger.error('[OPENOPS TOOLS] Error checking Python version:', error);
    }

    // Verify schema file exists and is readable
    try {
      const stats = await fs.stat(tempSchemaPath);
      logger.info('[OPENOPS TOOLS] Schema file stats:', {
        size: stats.size,
        permissions: stats.mode,
        lastModified: stats.mtime,
      });
    } catch (error) {
      logger.error('[OPENOPS TOOLS] Schema file verification failed:', {
        error: error instanceof Error ? error.message : String(error),
        path: tempSchemaPath,
      });
      throw new Error('Schema file verification failed');
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
          PYTHONUNBUFFERED: '1',
          PYTHONIOENCODING: 'utf-8',
          PYTHONPATH: basePath,
        },
      }),
    });

    // Wait longer for Python process to initialize and log any startup issues
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify the client is still connected
    try {
      const toolSet = await openopsClient.tools();
      logger.info('[OPENOPS TOOLS] Successfully retrieved tools:', {
        toolCount: Object.keys(toolSet).length,
      });
      return {
        client: openopsClient,
        toolSet,
      };
    } catch (error) {
      logger.error('[OPENOPS TOOLS] Failed to get tools from client:', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
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
