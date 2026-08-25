// Module augmentation for `app.swagger()`; not reliable transitively.
import { createMCPClient } from '@ai-sdk/mcp';
import '@fastify/swagger';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  AppSystemProp,
  networkUtls,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { accessTokenManager } from '../../authentication/context/access-token-manager';
import { buildMcpDocument } from '../../mcp/mcp-document';
import { getMcpProfiles } from '../../mcp/mcp-profile-factory';
import { MCPTool } from './types';

let cachedSchemaPath: string | undefined;

async function getOpenApiSchemaPath(app: FastifyInstance): Promise<string> {
  if (!cachedSchemaPath) {
    // A file rather than the HTTP endpoint the hosted server reads: a process is spawned
    // per chat request, so a self-call per spawn would cost more than a write.
    const document = buildMcpDocument(app.swagger(), getMcpProfiles().chat);

    cachedSchemaPath = path.join(os.tmpdir(), 'openapi-schema.json');
    await fs.writeFile(cachedSchemaPath, JSON.stringify(document), 'utf-8');
  }
  return cachedSchemaPath;
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

  const tempSchemaPath = await getOpenApiSchemaPath(app);

  const serviceToken =
    await accessTokenManager.generateServiceToken(userAuthToken);

  const openopsClient = await createMCPClient({
    transport: new StdioClientTransport({
      command: pythonPath,
      args: [serverPath],
      env: {
        // Explicit, so a .env in the server's checkout configured for the hosted http
        // transport cannot hijack a process spawned to speak stdio.
        MCP_TRANSPORT: 'stdio',
        OPENOPS_API_OPENAPI_PATH: tempSchemaPath,
        AUTH_TOKEN: serviceToken,
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
