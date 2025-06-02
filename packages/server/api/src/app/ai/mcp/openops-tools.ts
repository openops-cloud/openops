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
import { OpenAPI } from 'openapi-types';
import path from 'path';
import { MCPTool } from './mcp-tools';

const EXCLUDED_PATHS = [
  '/v1/authentication',
  '/v1/organizations',
  '/v1/users',
];

const EXCLUDED_OPERATIONS = ['delete'];

type OpenApiPathItem = {
  [method: string]: {
    tags?: string[];
    summary?: string;
    description?: string;
    operationId?: string;
    parameters?: unknown[];
    requestBody?: unknown;
    responses?: Record<string, unknown>;
  };
};

function filterOpenApiSchema(schema: OpenAPI.Document): OpenAPI.Document {
  const filteredSchema = { ...schema };

  if (filteredSchema.paths) {
    const filteredPaths: Record<string, OpenApiPathItem> = {};

    for (const [path, pathItem] of Object.entries(filteredSchema.paths)) {
      if (
        EXCLUDED_PATHS.some((excludedPath) => path.startsWith(excludedPath))
      ) {
        continue;
      }

      const filteredPathItem: OpenApiPathItem = {};
      for (const [method, operation] of Object.entries(
        pathItem as Record<string, OpenApiPathItem[string]>,
      )) {
        if (!EXCLUDED_OPERATIONS.includes(method.toLowerCase())) {
          filteredPathItem[method] = operation;
        }
      }

      if (Object.keys(filteredPathItem).length > 0) {
        filteredPaths[path] = filteredPathItem;
      }
    }

    filteredSchema.paths = filteredPaths;
  }

  return filteredSchema;
}

export async function getOpenOpsTools(
  app: FastifyInstance,
  authToken: string,
): Promise<MCPTool> {
  const basePath = system.getOrThrow<string>(
    AppSystemProp.OPENOPS_MCP_SERVER_PATH,
  );

  const pythonPath = path.join(basePath, '.venv', 'bin', 'python');
  const serverPath = path.join(basePath, 'main.py');

  const openApiSchema = app.swagger() as OpenAPI.Document;
  const filteredSchema = filterOpenApiSchema(openApiSchema);

  try {
    const openopsClient = await experimental_createMCPClient({
      transport: new Experimental_StdioMCPTransport({
        command: pythonPath,
        args: [serverPath],
        env: {
          OPENAPI_SCHEMA: JSON.stringify(filteredSchema),
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
