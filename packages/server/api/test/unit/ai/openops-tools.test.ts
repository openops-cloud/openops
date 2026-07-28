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

  const mockApp = {
    swagger: jest.fn().mockReturnValue(mockOpenApiSchema),
  } as unknown as FastifyInstance;

  const writtenRoutes = (): { path: string; methods: string[] }[] => {
    const [, contents] = jest.mocked(fs.writeFile).mock.calls[0];
    return JSON.parse(contents as string).routes;
  };

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

  // The written path is cached for the life of the process, so only the first call in
  // this file performs the write. Both assertions about its contents live here.
  it('should write only the allowed operations the API actually exposes', async () => {
    createMcpClientMock.mockResolvedValue({
      tools: jest.fn().mockResolvedValue(mockTools),
    });

    await getOpenOpsTools(mockApp, 'auth-1');

    const [target] = jest.mocked(fs.writeFile).mock.calls[0];
    expect(target).toBe(path.join('/tmp', 'openops-mcp-routes.json'));

    // `/v1/blocks/options` is allow-listed but missing from this document. It must be
    // left out: the MCP server refuses to start on an operation it cannot find, which
    // would cost every other tool too.
    expect(writtenRoutes()).toEqual([
      { path: '/v1/files/{fileId}', methods: ['get'] },
      { path: '/v1/flow-versions/', methods: ['get'] },
      { path: '/v1/flows/', methods: ['get'] },
      { path: '/v1/flows/count', methods: ['get'] },
      { path: '/v1/flows/{id}', methods: ['get'] },
      { path: '/v1/blocks/categories', methods: ['get'] },
      { path: '/v1/blocks/', methods: ['get'] },
      { path: '/v1/blocks/{scope}/{name}', methods: ['get'] },
      { path: '/v1/blocks/{name}', methods: ['get'] },
      { path: '/v1/flow-runs/', methods: ['get'] },
      { path: '/v1/flow-runs/{id}', methods: ['get'] },
      { path: '/v1/flow-runs/{id}/retry', methods: ['post'] },
      { path: '/v1/app-connections/', methods: ['get', 'patch'] },
      { path: '/v1/app-connections/{id}', methods: ['get'] },
      { path: '/v1/app-connections/metadata', methods: ['get'] },
    ]);

    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Skipping MCP operations the API does not expose',
      { path: '/v1/blocks/options', requested: ['post'], served: [] },
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
        MCP_TRANSPORT: 'stdio',
        AUTH_TOKEN: 'auth-service-token',
        OPENOPS_MCP_ROUTES: path.join('/tmp', 'openops-mcp-routes.json'),
        OPENOPS_API_URL: mockApiBaseUrl,
        OPENOPS_MCP_SERVER_PATH: mockBasePath,
        LOGZIO_TOKEN: 'test-logzio-token',
        ENVIRONMENT: 'test-environment',
      }),
    });
  });
});
