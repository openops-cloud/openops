import { createMCPClient } from '@ai-sdk/mcp';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  AppSystemProp,
  logger,
  networkUtls,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import { OpenAPI } from 'openapi-types';
import os from 'os';
import path from 'path';
import { accessTokenManager } from '../../authentication/context/access-token-manager';
import { MCPTool } from './types';

const INCLUDED_PATHS: Record<string, string[]> = {
  '/v1/files/{fileId}': ['get'],
  '/v1/flow-versions/': ['get'],
  '/v1/flows/': ['get'],
  '/v1/flows/count': ['get'],
  '/v1/flows/{id}': ['get'],
  '/v1/blocks/categories': ['get'],
  '/v1/blocks/': ['get'],
  '/v1/blocks/options': ['post'],
  '/v1/blocks/{scope}/{name}': ['get'],
  '/v1/blocks/{name}': ['get'],
  '/v1/flow-runs/': ['get'],
  '/v1/flow-runs/{id}': ['get'],
  '/v1/flow-runs/{id}/retry': ['post'],
  '/v1/app-connections/': ['get', 'patch'],
  '/v1/app-connections/{id}': ['get'],
  '/v1/app-connections/metadata': ['get'],
};

/**
 * The MCP server takes its allow-list as a file and reads the OpenAPI document from
 * the API itself, so this writes `INCLUDED_PATHS` out in the shape it expects. Writing
 * it rather than shipping a copy alongside the MCP server keeps this the only place
 * the chat's exposed surface is declared.
 *
 * Entries the running API does not serve are dropped, which is what the old schema
 * filter did implicitly. It matters more now: the MCP server refuses to start on an
 * operation it cannot find, so passing a stale entry through would cost every tool
 * rather than the one that drifted.
 */
function buildRouteList(schema: OpenAPI.Document): string {
  const available = schema.paths ?? {};

  const routes = Object.entries(INCLUDED_PATHS)
    .map(([path, methods]) => {
      const pathItem = available[path];
      const served = pathItem
        ? methods.filter((method) => method in pathItem)
        : [];

      if (served.length !== methods.length) {
        logger.warn('Skipping MCP operations the API does not expose', {
          path,
          requested: methods,
          served,
        });
      }

      return { path, methods: served };
    })
    .filter((route) => route.methods.length > 0);

  return JSON.stringify({ routes });
}

let cachedRoutesPath: string | undefined;

async function getRouteListPath(app: FastifyInstance): Promise<string> {
  if (!cachedRoutesPath) {
    const routesPath = path.join(os.tmpdir(), 'openops-mcp-routes.json');
    await fs.writeFile(routesPath, buildRouteList(app.swagger()), 'utf-8');
    cachedRoutesPath = routesPath;
  }
  return cachedRoutesPath;
}

export async function getOpenOpsTools(
  app: FastifyInstance,
  userAuthToken: string,
): Promise<MCPTool> {
  const basePath = system.getOrThrow<string>(
    AppSystemProp.OPENOPS_MCP_SERVER_PATH,
  );

  const pythonPath = path.join(basePath, '.venv', 'bin', 'python');
  const serverPath = path.join(basePath, 'main.py');

  const routesPath = await getRouteListPath(app);

  const serviceToken =
    await accessTokenManager.generateServiceToken(userAuthToken);

  const openopsClient = await createMCPClient({
    transport: new StdioClientTransport({
      command: pythonPath,
      args: [serverPath],
      env: {
        // stdio: the server acts as one service principal, so the token is passed
        // in rather than obtained per request as it is over HTTP.
        MCP_TRANSPORT: 'stdio',
        AUTH_TOKEN: serviceToken,
        OPENOPS_MCP_ROUTES: routesPath,
        OPENOPS_API_URL: networkUtls.getInternalApiUrl(),
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
