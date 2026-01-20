const mockBasePath = '/mock/base/path';
const mockApiBaseUrl = 'http://test-api-url';
const mockTools = {
  tool1: {
    description: 'Test tool 1',
    parameters: {},
    toolProvider: 'openops',
  },
  tool2: {
    description: 'Test tool 2',
    parameters: {},
    toolProvider: 'openops',
  },
};

const systemMock = {
  get: jest.fn(),
  getOrThrow: jest.fn(),
  getNumber: jest.fn(),
};

const loggerMock = {
  warn: jest.fn(),
  error: jest.fn(),
};

const networkUtlsMock = {
  getInternalApiUrl: jest.fn(),
};

const generateServiceTokenMock = jest.fn();
jest.mock(
  '../../../src/app/authentication/context/access-token-manager',
  () => ({
    accessTokenManager: {
      generateServiceToken: generateServiceTokenMock,
    },
  }),
);

const createMcpClientMock = jest.fn();
jest.mock('@ai-sdk/mcp', () => ({
  createMCPClient: createMcpClientMock,
}));

const mockTransport = {};
jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn().mockImplementation(() => mockTransport),
}));

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  system: systemMock,
  logger: loggerMock,
  networkUtls: networkUtlsMock,
  AppSystemProp: {
    OPENOPS_MCP_SERVER_PATH: 'OPENOPS_MCP_SERVER_PATH',
  },
  SharedSystemProp: {
    LOGZIO_TOKEN: 'LOGZIO_TOKEN',
    ENVIRONMENT_NAME: 'ENVIRONMENT_NAME',
  },
}));

jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  writeFile: jest.fn(),
}));

jest.mock('os', () => ({
  ...jest.requireActual('os'),
  tmpdir: jest.fn().mockReturnValue('/tmp'),
}));

import '@fastify/swagger';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { getOpenOpsTools } from '../../../src/app/ai/mcp/openops-tools';

describe('getOpenOpsTools', () => {
  const mockOpenApiSchema = {
    openapi: '3.1',
    paths: {
      '/v1/files/{fileId}': {
        get: { operationId: 'getFile' },
      },
      '/v1/flow-versions/': {
        get: { operationId: 'getFlowVersions' },
      },
      '/v1/flows/': {
        get: { operationId: 'getFlows' },
      },
      '/v1/flows/count': {
        get: { operationId: 'getFlowsCount' },
      },
      '/v1/flows/{id}': {
        get: { operationId: 'getFlow' },
      },
      '/v1/blocks/categories': {
        get: { operationId: 'getBlockCategories' },
      },
      '/v1/blocks/': {
        get: { operationId: 'getBlocks' },
      },
      '/v1/blocks/{scope}/{name}': {
        get: { operationId: 'getBlockScopeName' },
      },
      '/v1/blocks/{name}': {
        get: { operationId: 'getBlockName' },
      },
      '/v1/flow-runs/': {
        get: { operationId: 'getFlowRuns' },
      },
      '/v1/flow-runs/{id}': {
        get: { operationId: 'getFlowRun' },
      },
      '/v1/flow-runs/{id}/retry': {
        post: { operationId: 'retryFlowRun' },
      },
      '/v1/app-connections/': {
        get: { operationId: 'getAppConnections' },
        patch: { operationId: 'patchAppConnection' },
      },
      '/v1/app-connections/{id}': {
        get: { operationId: 'getAppConnectionById' },
      },
      '/v1/app-connections/metadata': {
        get: { operationId: 'getAppConnectionsMetadata' },
      },
      '/v1/other/endpoint': {
        get: { operationId: 'getOther' },
      },
    },
  };

  const filteredSchema = {
    openapi: '3.1',
    paths: {
      '/v1/files/{fileId}': {
        get: { operationId: 'getFile' },
      },
      '/v1/flow-versions/': {
        get: { operationId: 'getFlowVersions' },
      },
      '/v1/flows/': {
        get: { operationId: 'getFlows' },
      },
      '/v1/flows/count': {
        get: { operationId: 'getFlowsCount' },
      },
      '/v1/flows/{id}': {
        get: { operationId: 'getFlow' },
      },
      '/v1/blocks/categories': {
        get: { operationId: 'getBlockCategories' },
      },
      '/v1/blocks/': {
        get: { operationId: 'getBlocks' },
      },
      '/v1/blocks/{scope}/{name}': {
        get: { operationId: 'getBlockScopeName' },
      },
      '/v1/blocks/{name}': {
        get: { operationId: 'getBlockName' },
      },
      '/v1/flow-runs/': {
        get: { operationId: 'getFlowRuns' },
      },
      '/v1/flow-runs/{id}': {
        get: { operationId: 'getFlowRun' },
      },
      '/v1/flow-runs/{id}/retry': {
        post: { operationId: 'retryFlowRun' },
      },
      '/v1/app-connections/': {
        get: { operationId: 'getAppConnections' },
        patch: { operationId: 'patchAppConnection' },
      },
      '/v1/app-connections/{id}': {
        get: { operationId: 'getAppConnectionById' },
      },
      '/v1/app-connections/metadata': {
        get: { operationId: 'getAppConnectionsMetadata' },
      },
    },
  };

  const mockApp = {
    swagger: jest.fn().mockReturnValue(mockOpenApiSchema),
  } as unknown as FastifyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    systemMock.getOrThrow.mockImplementation((key) => {
      if (key === 'OPENOPS_MCP_SERVER_PATH') return mockBasePath;
      throw new Error(`${key} not set`);
    });

    systemMock.get.mockImplementation((key) => {
      if (key === 'LOGZIO_TOKEN') return 'test-logzio-token';
      if (key === 'ENVIRONMENT_NAME') return 'test-environment';
      return undefined;
    });

    networkUtlsMock.getInternalApiUrl.mockReturnValue(mockApiBaseUrl);
  });

  it('should write the filtered OpenAPI schema to a file once and reuse it later', async () => {
    const mockClient = {
      tools: jest.fn().mockResolvedValue(mockTools),
    };
    createMcpClientMock.mockResolvedValue(mockClient);

    await getOpenOpsTools(mockApp, 'auth-1');
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('/tmp', 'openapi-schema.json'),
      JSON.stringify(filteredSchema),
      'utf-8',
    );

    await getOpenOpsTools(mockApp, 'auth-2');
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should create MCP client and return tools when successful', async () => {
    const mockClient = {
      tools: jest.fn().mockResolvedValue(mockTools),
    };
    createMcpClientMock.mockResolvedValue(mockClient);
    generateServiceTokenMock.mockResolvedValue('auth-service-token');

    const result = await getOpenOpsTools(mockApp, 'test-auth-token');

    expect(result).toEqual({
      client: mockClient,
      toolSet: mockTools,
    });

    expect(createMcpClientMock).toHaveBeenCalledWith({
      transport: mockTransport,
    });

    expect(StdioClientTransport).toHaveBeenCalledWith({
      command: `${mockBasePath}/.venv/bin/python`,
      args: [`${mockBasePath}/main.py`],
      env: expect.objectContaining({
        OPENAPI_SCHEMA_PATH: expect.any(String),
        AUTH_TOKEN: 'auth-service-token',
        API_BASE_URL: mockApiBaseUrl,
        OPENOPS_MCP_SERVER_PATH: mockBasePath,
        LOGZIO_TOKEN: 'test-logzio-token',
        ENVIRONMENT: 'test-environment',
      }),
    });
  });
});
