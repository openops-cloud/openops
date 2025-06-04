import {
  AppSystemProp,
  networkUtls,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import { experimental_createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import { OpenAPI } from 'openapi-types';
import os from 'os';
import path from 'path';
import { MCPTool } from './mcp-tools';

const INCLUDED_PATHS = [
  '/v1/folders',
  '/v1/flow-versions',
  '/v1/flows',
  '/v1/files',
  '/v1/flow-templates',
  '/v1/test-trigger',
  '/v1/blocks',
  '/v1/flow-runs',
  '/v1/app-connections',
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
        !INCLUDED_PATHS.some((includedPath) => path.startsWith(includedPath))
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

let cachedSchemaPath: string | undefined;

async function getOpenApiSchemaPath(app: FastifyInstance): Promise<string> {
  if (!cachedSchemaPath) {
    const openApiSchema = app.swagger();
    const filteredSchema = filterOpenApiSchema(openApiSchema);
    cachedSchemaPath = path.join(os.tmpdir(), 'openapi-schema.json');
    await fs.writeFile(
      cachedSchemaPath,
      JSON.stringify(filteredSchema),
      'utf-8',
    );
  }
  return cachedSchemaPath;
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

  const tempSchemaPath = await getOpenApiSchemaPath(app);

  const openopsClient = await experimental_createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: pythonPath,
      args: [serverPath],
      env: {
        OPENAPI_SCHEMA_PATH: tempSchemaPath,
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
}
