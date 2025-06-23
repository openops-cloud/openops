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

const INCLUDED_PATHS: Record<string, string[]> = {
  '/v1/files/{fileId}': ['get'],
  '/v1/flow-versions/': ['get'],
  '/v1/flows/': ['get'],
  '/v1/flows/count': ['get'],
  '/v1/flows/{id}': ['get'],
  '/v1/blocks/categories': ['get'],
  '/v1/blocks/': ['get'],
  '/v1/blocks/{scope}/{name}': ['get'],
  '/v1/blocks/{name}': ['get'],
  '/v1/flow-runs/': ['get'],
  '/v1/flow-runs/{id}': ['get'],
  '/v1/flow-runs/{id}/retry': ['post'],
  '/v1/app-connections/': ['get', 'patch'],
  '/v1/app-connections/{id}': ['get'],
  '/v1/app-connections/metadata': ['get'],
  '/v1/test/step': ['post'],
  '/v1/test/flowVersion': ['post'],
};

function filterOpenApiSchema(schema: OpenAPI.Document): OpenAPI.Document {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredPaths: Record<string, any> = {};

  for (const [path, pathItem] of Object.entries(schema.paths ?? {})) {
    if (!INCLUDED_PATHS[path]) continue;

    filteredPaths[path] = {};
    for (const [method, op] of Object.entries(pathItem)) {
      if (INCLUDED_PATHS[path].includes(method.toLowerCase())) {
        filteredPaths[path][method] = op;
      }
    }
  }

  return { ...schema, paths: filteredPaths };
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
  const tools = await openopsClient.tools();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolSet: Record<string, any> = {};
  for (const [key, tool] of Object.entries(tools)) {
    toolSet[key] = {
      ...tool,
      toolProvider: 'openops',
    };
  }

  return {
    client: openopsClient,
    toolSet,
  };
}
