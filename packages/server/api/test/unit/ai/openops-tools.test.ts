const mockBasePath = '/mock/base/path';
const mockApiBaseUrl = 'http://test-api-url';
const mockTools = {
  tool1: { description: 'Test tool 1', parameters: {} },
  tool2: { description: 'Test tool 2', parameters: {} },
};

const createMcpClientMock = jest.fn();
jest.mock('ai', () => ({
  experimental_createMCPClient: createMcpClientMock,
}));

const systemMock = {
  get: jest.fn(),
  getOrThrow: jest.fn(),
};

const loggerMock = {
  warn: jest.fn(),
  error: jest.fn(),
};

const networkUtlsMock = {
  getInternalApiUrl: jest.fn(),
};

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
import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { getOpenOpsTools } from '../../../src/app/ai/mcp/openops-tools';

describe('getOpenOpsTools', () => {
  const mockOpenApiSchema = {
    openapi: '3.1',
    paths: {
      '/v1/authentication/sign-in': {
        post: { operationId: 'signIn' },
      },
      '/v1/users/profile': {
        get: { operationId: 'getProfile' },
        delete: { operationId: 'deleteProfile' },
      },
      '/v1/organizations/123': {
        get: { operationId: 'getOrg' },
        put: { operationId: 'updateOrg' },
      },
      '/v1/api/endpoint': {
        get: { operationId: 'getData' },
        post: { operationId: 'createData' },
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

  it('should write the OpenAPI schema to a file once and reuse it later', async () => {
    const mockClient = {
      tools: jest.fn().mockResolvedValue(mockTools),
    };
    createMcpClientMock.mockResolvedValue(mockClient);

    await getOpenOpsTools(mockApp, 'auth-1');
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('/tmp', 'openapi-schema.json'),
      JSON.stringify({ openapi: '3.1' }),
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

    const result = await getOpenOpsTools(mockApp, 'test-auth-token');

    expect(result).toEqual({
      client: mockClient,
      toolSet: mockTools,
    });

    const filteredSchema = JSON.parse(
      createMcpClientMock.mock.calls[0][0].transport.serverParams.env
        .OPENAPI_SCHEMA,
    );

    expect(filteredSchema.paths).toEqual({
      '/v1/api/endpoint': {
        get: { operationId: 'getData' },
        post: { operationId: 'createData' },
      },
    });
    expect(filteredSchema.paths['/v1/authentication/sign-in']).toBeUndefined();
    expect(filteredSchema.paths['/v1/users/profile']).toBeUndefined();
    expect(filteredSchema.paths['/v1/organizations/123']).toBeUndefined();
    expect(filteredSchema.paths['/v1/api/endpoint'].delete).toBeUndefined();
  });

  it('should return empty object and log error if MCP client creation fails', async () => {
    const mockError = new Error('Test error');
    createMcpClientMock.mockRejectedValue(mockError);

    const result = await getOpenOpsTools(mockApp, 'mock-auth-token');

    expect(result).toEqual({
      client: undefined,
      toolSet: {},
    });
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Failed to create OpenOps MCP client:',
      mockError,
    );
    expect(createMcpClientMock).toHaveBeenCalledWith({
      transport: expect.objectContaining({
        serverParams: {
          command: `${mockBasePath}/.venv/bin/python`,
          args: [`${mockBasePath}/main.py`],
          env: {
            OPENAPI_SCHEMA_PATH: expect.any(String),
            AUTH_TOKEN: 'test-auth-token',
            API_BASE_URL: mockApiBaseUrl,
            OPENOPS_MCP_SERVER_PATH: mockBasePath,
            LOGZIO_TOKEN: 'test-logzio-token',
            ENVIRONMENT: 'test-environment',
          },
        },
      }),
    });
  });
});
