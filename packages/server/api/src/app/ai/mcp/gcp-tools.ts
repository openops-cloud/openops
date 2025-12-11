import {
  AppSystemProp,
  logger,
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
  const gcpMcpConfig = (await mcpConfigService.list(projectId)).find(
    (c) => c.name === GCP_MCP_CONFIG_NAME,
  );

  if (isEmpty(gcpMcpConfig) || !gcpMcpConfig?.config['enabled']) {
    logger.debug('GCP is not enabled in MCP config, skipping GCP tools');
    return null;
  }

  const config = gcpMcpConfig.config as Record<string, unknown>;
  const connectionName = config['connectionName'] as string;

  if (isEmpty(connectionName)) {
    if (enableHostSession) {
      logger.debug(
        'No GCP connection configured, using host session credentials',
      );
      return {
        keyFileContent: null,
        useHostSession: true,
      };
    }
    logger.debug(
      'connectionName is missing in the GCP MCP config, skipping GCP tool',
    );
    return null;
  }

  const connection = await appConnectionService.getOne({
    projectId,
    name: connectionName,
  });

  if (!connection) {
    logger.debug(
      `GCP connection '${connectionName}' not found, skipping GCP tools`,
    );
    return null;
  }

  const gcpAuth = (connection.value as CustomAuthConnectionValue)
    .props as unknown as { keyFileContent: string };
  const keyFileContent = gcpAuth.keyFileContent;

  if (!keyFileContent) {
    logger.debug(
      `GCP credentials not found in connection '${connectionName}', skipping GCP tools`,
    );
    return null;
  }

  return {
    keyFileContent,
    useHostSession: false,
  };
}

type McpServerConfig = {
  basePath: string;
  toolProvider: string;
};

async function initializeMcpClient(
  config: McpServerConfig,
  credentials: GcpCredentials,
): Promise<MCPTool> {
  const serverPath = path.join(
    config.basePath,
    'packages',
    'gcloud-mcp',
    'dist',
    'bundle.js',
  );

  const env: Record<string, string> = {
    PATH: process.env.PATH || '',
    CLOUDSDK_CORE_DISABLE_PROMPTS: '1',
  };

  let credentialsFile: string | undefined;
  let gcpConfigDir: string | undefined;

  if (!credentials.useHostSession && credentials.keyFileContent) {
    gcpConfigDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'gcloud-config-mcp-'),
    );
    env.CLOUDSDK_CONFIG = gcpConfigDir;

    credentialsFile = path.join(
      os.tmpdir(),
      `gcp-credentials-${Date.now()}.json`,
    );
    await fs.writeFile(credentialsFile, credentials.keyFileContent, 'utf-8');

    try {
      const authCommand = `gcloud auth activate-service-account --key-file=${credentialsFile}`;
      await execAsync(authCommand, {
        env: {
          ...process.env,
          CLOUDSDK_CONFIG: gcpConfigDir,
          CLOUDSDK_CORE_DISABLE_PROMPTS: '1',
        },
      });
      logger.debug('Successfully authenticated gcloud with service account');
    } catch (error) {
      logger.error('Failed to authenticate gcloud with service account', {
        error,
      });
      throw error;
    }
  } else if (process.env['CLOUDSDK_CONFIG']) {
    env.CLOUDSDK_CONFIG = process.env['CLOUDSDK_CONFIG'];
  }

  logger.debug(
    `Initializing ${config.toolProvider} MCP client with GCP credentials`,
    {
      useHostSession: credentials.useHostSession,
      hasKeyFileContent: !!credentials.keyFileContent,
      serverPath,
      credentialsFile,
      gcpConfigDir,
    },
  );

  const client = await experimental_createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: 'node',
      args: [serverPath],
      env,
    }),
  });

  const tools = await client.tools();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolSet: Record<string, any> = {};
  for (const [key, tool] of Object.entries(tools)) {
    toolSet[key] = {
      ...tool,
      toolProvider: config.toolProvider,
    };
  }

  return {
    client,
    toolSet,
  };
}

export async function getGcpTools(projectId: string): Promise<{
  gcpMcp: MCPTool;
}> {
  const credentials = await getGcpCredentials(projectId);
  if (!credentials) {
    return {
      gcpMcp: { client: undefined, toolSet: {} },
    };
  }

  const gcpBasePath = system.getOrThrow<string>(AppSystemProp.GCP_MCP_PATH);

  const gcpMcp = await initializeMcpClient(
    {
      basePath: gcpBasePath,
      toolProvider: 'gcp',
    },
    credentials,
  );

  return { gcpMcp };
}
