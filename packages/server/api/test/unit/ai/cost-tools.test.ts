import { AppSystemProp, logger, system } from '@openops/server-shared';
import {
  AppConnection,
  AppConnectionStatus,
  AppConnectionType,
  AWS_COST_MCP_CONFIG_NAME,
  CustomAuthConnectionValue,
} from '@openops/shared';
import { experimental_createMCPClient } from 'ai';
import { getCostTools } from '../../../src/app/ai/mcp/cost-tools';
import { appConnectionService } from '../../../src/app/app-connection/app-connection-service/app-connection-service';
import { mcpConfigService } from '../../../src/app/mcp/config/mcp-config.service';

jest.mock('@openops/server-shared', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
  system: {
    getOrThrow: jest.fn(),
  },
  AppSystemProp: {
    AWS_MCP_COST_PATH: 'AWS_MCP_COST_PATH',
  },
}));

jest.mock('ai', () => ({
  experimental_createMCPClient: jest.fn(),
}));

const mockTransport = {
  env: {
    AWS_ACCESS_KEY_ID: '',
    AWS_SECRET_ACCESS_KEY: '',
    AWS_REGION: '',
    AWS_MCP_COST_PATH: '',
    AWS_SDK_LOAD_CONFIG: '1',
  },
};

jest.mock('ai/mcp-stdio', () => ({
  Experimental_StdioMCPTransport: jest
    .fn()
    .mockImplementation(() => mockTransport),
}));

jest.mock(
  '../../../src/app/app-connection/app-connection-service/app-connection-service',
  () => ({
    appConnectionService: {
      getOne: jest.fn(),
    },
  }),
);

jest.mock('../../../src/app/mcp/config/mcp-config.service', () => ({
  mcpConfigService: {
    get: jest.fn(),
    list: jest.fn(),
  },
}));

describe('getCostTools', () => {
  const mockProjectId = 'test-project-id';
  const mockBasePath = '/mock/base/path';
  const mockTools = {
    tool1: {
      description: 'Test tool 1',
      parameters: {},
    },
    tool2: {
      description: 'Test tool 2',
      parameters: {},
    },
  };

  const mockAwsCredentials = {
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    region: 'us-east-1',
  };

  const mockMcpConfig = {
    id: 'test-config-id',
    projectId: mockProjectId,
    name: AWS_COST_MCP_CONFIG_NAME,
    config: {
      enabled: true,
      connectionName: 'test-aws-connection',
    },
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  const mockConnection: AppConnection = {
    id: 'test-connection-id',
    name: 'test-aws-connection',
    type: AppConnectionType.CUSTOM_AUTH,
    projectId: mockProjectId,
    status: AppConnectionStatus.ACTIVE,
    value: {
      type: AppConnectionType.CUSTOM_AUTH,
      props: mockAwsCredentials,
    } as CustomAuthConnectionValue,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    authProviderKey: 'aws',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransport.env = {
      AWS_ACCESS_KEY_ID: '',
      AWS_SECRET_ACCESS_KEY: '',
      AWS_REGION: '',
      AWS_MCP_COST_PATH: '',
      AWS_SDK_LOAD_CONFIG: '1',
    };

    (system.getOrThrow as jest.Mock).mockImplementation((key: string) => {
      if (key === AppSystemProp.AWS_MCP_COST_PATH) return mockBasePath;

      throw new Error(`${key} not set`);
    });

    (mcpConfigService.list as jest.Mock).mockResolvedValue([mockMcpConfig]);
    (appConnectionService.getOne as jest.Mock).mockResolvedValue(
      mockConnection,
    );
  });

  it('should return empty tools when AWS Cost is not enabled', async () => {
    (mcpConfigService.list as jest.Mock).mockResolvedValue([
      {
        ...mockMcpConfig,
        config: { enabled: false },
      },
    ]);

    const result = await getCostTools(mockProjectId);

    expect(result).toEqual({
      costExplorer: { client: undefined, toolSet: {} },
      costAnalysis: { client: undefined, toolSet: {} },
    });
    expect(logger.debug).toHaveBeenCalledWith(
      'AWS Cost is not enabled in MCP config, skipping AWS cost tools',
    );
  });

  it('should return empty tools when AWS connection is not found', async () => {
    (mcpConfigService.list as jest.Mock).mockResolvedValue([mockMcpConfig]);
    (appConnectionService.getOne as jest.Mock).mockResolvedValue(null);

    const result = await getCostTools(mockProjectId);

    expect(result).toEqual({
      costExplorer: { client: undefined, toolSet: {} },
      costAnalysis: { client: undefined, toolSet: {} },
    });
    expect(logger.debug).toHaveBeenCalledWith(
      'AWS connection not found, skipping AWS cost tools',
    );
  });

  it('should return empty tools when AWS credentials are missing', async () => {
    (mcpConfigService.list as jest.Mock).mockResolvedValue([mockMcpConfig]);
    (appConnectionService.getOne as jest.Mock).mockResolvedValue({
      ...mockConnection,
      value: {
        type: AppConnectionType.CUSTOM_AUTH,
        props: {
          accessKeyId: '',
          secretAccessKey: '',
          region: 'us-east-1',
        },
      } as CustomAuthConnectionValue,
    });

    const result = await getCostTools(mockProjectId);

    expect(result).toEqual({
      costExplorer: { client: undefined, toolSet: {} },
      costAnalysis: { client: undefined, toolSet: {} },
    });
    expect(logger.debug).toHaveBeenCalledWith(
      'AWS credentials not found in connection, skipping AWS tools',
    );
  });

  it('should initialize both cost explorer and cost analysis clients with AWS credentials', async () => {
    const mockClient = {
      tools: jest.fn().mockResolvedValue(mockTools),
    };
    (experimental_createMCPClient as jest.Mock).mockResolvedValue(mockClient);

    (mcpConfigService.list as jest.Mock).mockResolvedValue([
      {
        ...mockMcpConfig,
        config: {
          enabled: true,
          connectionName: 'test-aws-connection',
        },
      },
    ]);

    (appConnectionService.getOne as jest.Mock).mockResolvedValue({
      ...mockConnection,
      value: {
        type: AppConnectionType.CUSTOM_AUTH,
        props: mockAwsCredentials,
      } as CustomAuthConnectionValue,
    });

    mockTransport.env = {
      AWS_ACCESS_KEY_ID: mockAwsCredentials.accessKeyId,
      AWS_SECRET_ACCESS_KEY: mockAwsCredentials.secretAccessKey,
      AWS_REGION: mockAwsCredentials.region,
      AWS_MCP_COST_PATH: mockBasePath,
      AWS_SDK_LOAD_CONFIG: '1',
    };

    const result = await getCostTools(mockProjectId);

    expect(result).toEqual({
      costExplorer: {
        client: mockClient,
        toolSet: {
          tool1: { ...mockTools.tool1, toolProvider: 'cost-explorer' },
          tool2: { ...mockTools.tool2, toolProvider: 'cost-explorer' },
        },
      },
      costAnalysis: {
        client: mockClient,
        toolSet: {
          tool1: { ...mockTools.tool1, toolProvider: 'aws-pricing' },
          tool2: { ...mockTools.tool2, toolProvider: 'aws-pricing' },
        },
      },
    });

    expect(experimental_createMCPClient).toHaveBeenCalledTimes(2);
    expect(experimental_createMCPClient).toHaveBeenCalledWith({
      transport: expect.any(Object),
    });

    const transportCalls = (experimental_createMCPClient as jest.Mock).mock
      .calls;
    expect(transportCalls[0][0].transport).toBeDefined();
    expect(transportCalls[1][0].transport).toBeDefined();

    const envVars = transportCalls[0][0].transport.env;
    expect(envVars).toEqual({
      AWS_ACCESS_KEY_ID: mockAwsCredentials.accessKeyId,
      AWS_SECRET_ACCESS_KEY: mockAwsCredentials.secretAccessKey,
      AWS_REGION: mockAwsCredentials.region,
      AWS_MCP_COST_PATH: mockBasePath,
      AWS_SDK_LOAD_CONFIG: '1',
    });
  });
});
