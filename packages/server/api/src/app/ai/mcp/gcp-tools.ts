/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AppSystemProp,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import {
  CustomAuthConnectionValue,
  GCP_MCP_CONFIG_NAME,
  isEmpty,
} from '@openops/shared';
import { experimental_createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { exec } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { appConnectionService } from '../../app-connection/app-connection-service/app-connection-service';
import { mcpConfigService } from '../../mcp/config/mcp-config.service';
import { MCPTool } from './types';

const execAsync = promisify(exec);
const enableHostSession =
  system.getBoolean(SharedSystemProp.ENABLE_HOST_SESSION) ?? false;

type GcpCredentials = {
  keyFileContent: string | null;
  useHostSession: boolean;
};

async function getGcpCredentials(
  projectId: string,
): Promise<GcpCredentials | null> {
  const configs = await mcpConfigService.list(projectId);
  const gcpMcpConfig = configs.find((c) => c.name === GCP_MCP_CONFIG_NAME);

  if (isEmpty(gcpMcpConfig) || !gcpMcpConfig?.config) {
    return null;
  }

  const connectionName = gcpMcpConfig.config['connectionName'] as string;

  if (isEmpty(connectionName)) {
    return enableHostSession
      ? { keyFileContent: null, useHostSession: true }
      : null;
  }

  const connection = await appConnectionService.getOne({
    projectId,
    name: connectionName,
  });
  if (!connection) {
    return null;
  }

  const keyFileContent = (
    (connection.value as CustomAuthConnectionValue).props as {
      keyFileContent?: string;
    }
  )?.keyFileContent;
  return keyFileContent ? { keyFileContent, useHostSession: false } : null;
}

async function setupGcloudAuth(keyFileContent: string): Promise<string> {
  const gcpConfigDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'gcloud-config-mcp-'),
  );
  const credentialsFile = path.join(
    os.tmpdir(),
    `gcp-credentials-${Date.now()}.json`,
  );

  await fs.writeFile(credentialsFile, keyFileContent, 'utf-8');
  await execAsync(
    `gcloud auth activate-service-account --key-file=${credentialsFile}`,
    {
      env: {
        ...process.env,
        CLOUDSDK_CONFIG: gcpConfigDir,
        CLOUDSDK_CORE_DISABLE_PROMPTS: '1',
      },
    },
  );

  return gcpConfigDir;
}

async function createMcpClient(
  basePath: string,
  credentials: GcpCredentials,
): Promise<MCPTool> {
  const serverPath = path.join(
    basePath,
    'packages',
    'gcloud-mcp',
    'dist',
    'bundle.js',
  );
  const env: Record<string, string> = {
    PATH: process.env.PATH || '',
    CLOUDSDK_CORE_DISABLE_PROMPTS: '1',
  };

  if (!credentials.useHostSession && credentials.keyFileContent) {
    env.CLOUDSDK_CONFIG = await setupGcloudAuth(credentials.keyFileContent);
  } else if (process.env['CLOUDSDK_CONFIG']) {
    env.CLOUDSDK_CONFIG = process.env['CLOUDSDK_CONFIG'];
  }

  const client = await experimental_createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: 'node',
      args: [serverPath],
      env,
    }),
  });

  const tools = await client.tools();
  const toolSet: Record<string, any> = {};

  for (const [key, tool] of Object.entries(tools)) {
    toolSet[key] = { ...tool, toolProvider: 'gcp' };
  }

  return { client, toolSet };
}

export async function getGcpTools(
  projectId: string,
): Promise<{ gcpMcp: MCPTool }> {
  const credentials = await getGcpCredentials(projectId);

  if (!credentials) {
    return { gcpMcp: { client: undefined, toolSet: {} } };
  }

  const basePath = system.getOrThrow<string>(AppSystemProp.GCP_MCP_PATH);
  const gcpMcp = await createMcpClient(basePath, credentials);

  return { gcpMcp };
}
