import { AwsAuth } from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import {
  AWS_COST_MCP_CONFIG_NAME,
  CustomAuthConnectionValue,
  isEmpty,
} from '@openops/shared';
import { experimental_createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import path from 'path';
import { appConnectionService } from '../../app-connection/app-connection-service/app-connection-service';
import { mcpConfigService } from '../../mcp/config/mcp-config.service';
import { MCPTool } from './tools-initializer';

type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

async function getAwsCredentials(
  projectId: string,
): Promise<AwsCredentials | null> {
  const awsCostMcpConfig = (await mcpConfigService.list(projectId)).find(
    (c) => (c.name = AWS_COST_MCP_CONFIG_NAME),
  );

  if (isEmpty(awsCostMcpConfig) || !awsCostMcpConfig?.config['enabled']) {
    logger.debug(
      'AWS Cost is not enabled in MCP config, skipping AWS cost tools',
    );
    return null;
  }

  const config = awsCostMcpConfig.config as Record<string, unknown>;

  if (isEmpty(config['connectionName'])) {
    logger.debug(
      'connectionName is missing in the AWS Cost MCP config, skipping AWS cost tool',
    );
    return null;
  }

  const connection = await appConnectionService.getOne({
    projectId,
    name: config['connectionName'] as string,
  });

  if (!connection) {
    logger.debug('AWS connection not found, skipping AWS cost tools');
    return null;
  }

  const awsAuth = (connection.value as CustomAuthConnectionValue)
    .props as unknown as AwsAuth;
  const awsAccessKeyId = awsAuth.accessKeyId;
  const awsSecretAccessKey = awsAuth.secretAccessKey;
  const awsRegion = awsAuth.defaultRegion ?? 'us-east-1';

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    logger.debug('AWS credentials not found in connection, skipping AWS tools');
    return null;
  }

  return {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion,
  };
}

type McpServerConfig = {
  basePath: string;
  serverDir: string;
  toolProvider: string;
};

async function initializeMcpClient(
  config: McpServerConfig,
  credentials: AwsCredentials,
): Promise<MCPTool> {
  const pythonPath = path.join(config.basePath, '.venv', 'bin', 'python');
  const serverPath = path.join(config.basePath, config.serverDir, 'server.py');

  logger.debug(
    `Initializing ${config.toolProvider} MCP client with AWS credentials`,
    {
      region: credentials.region,
      hasAccessKey: !!credentials.accessKeyId,
      hasSecretKey: !!credentials.secretAccessKey,
    },
  );

  const client = await experimental_createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: pythonPath,
      args: [serverPath],
      env: {
        AWS_ACCESS_KEY_ID: credentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
        AWS_REGION: credentials.region,
        AWS_MCP_COST_PATH: config.basePath,
        AWS_SDK_LOAD_CONFIG: '1',
      },
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

export async function getCostTools(
  projectId: string,
): Promise<{ costExplorer: MCPTool; costAnalysis: MCPTool }> {
  const credentials = await getAwsCredentials(projectId);
  if (!credentials) {
    return {
      costExplorer: { client: undefined, toolSet: {} },
      costAnalysis: { client: undefined, toolSet: {} },
    };
  }

  const awsCostBasePath = system.getOrThrow<string>(
    AppSystemProp.AWS_MCP_COST_PATH,
  );

  const [costExplorer, costAnalysis] = await Promise.all([
    initializeMcpClient(
      {
        basePath: awsCostBasePath,
        serverDir:
          'src/cost-explorer-mcp-server/awslabs/cost_explorer_mcp_server',
        toolProvider: 'cost-explorer',
      },
      credentials,
    ),
    initializeMcpClient(
      {
        basePath: awsCostBasePath,
        serverDir: 'src/aws-pricing-mcp-server/awslabs/aws_pricing_mcp_server',
        toolProvider: 'cost-analysis',
      },
      credentials,
    ),
  ]);

  return { costExplorer, costAnalysis };
}
