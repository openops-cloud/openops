const serverSharedMock = {
  ...jest.requireActual('@openops/server-shared'),
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
  networkUtls: {
    getInternalApiUrl: jest.fn(),
  },
};
jest.mock('@openops/server-shared', () => serverSharedMock);

const createMcpClientMock = jest.fn();
jest.mock('ai', () => ({
  experimental_createMCPClient: createMcpClientMock,
}));

import { FastifyInstance } from 'fastify';
import { getOpenOpsTools } from '../../../src/app/ai/mcp/openops-tools';

describe('OpenOps Tools', () => {
  const originalEnv = process.env;

  const mockApp = {
    swagger: jest.fn().mockReturnValue({ openapi: '3.1' }),
  } as unknown as FastifyInstance;

  const mockTools = {
    tool1: { description: 'Test tool 1', parameters: {} },
    tool2: { description: 'Test tool 2', parameters: {} },
  };

  const mockApiBaseUrl = 'http://test-api-url';
  const mockBasePath = '/mock/base/path';

  beforeAll(() => {
    process.env.OPS_LOGZIO_TOKEN = 'test-logzio-token';
    process.env.OPS_ENVIRONMENT_NAME = 'test-environment';
    process.env.OPS_OPENOPS_MCP_SERVER_PATH = mockBasePath;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    serverSharedMock.networkUtls.getInternalApiUrl.mockReturnValue(
      mockApiBaseUrl,
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return empty object when OPENOPS_MCP_SERVER_PATH is not set', async () => {
    process.env.OPS_OPENOPS_MCP_SERVER_PATH = undefined;

    const result = await getOpenOpsTools(mockApp, 'test-auth-token');

    expect(result).toEqual({});
    expect(serverSharedMock.logger.warn).toHaveBeenCalledWith(
      'OPENOPS_MCP_SERVER_PATH not set',
    );
  });

  it('should create MCP client and return tools when successful', async () => {
    const mockClient = {
      tools: jest.fn().mockResolvedValue(mockTools),
    };
    createMcpClientMock.mockResolvedValue(mockClient);

    const result = await getOpenOpsTools(mockApp, 'test-auth-token');

    expect(createMcpClientMock).toHaveBeenCalledWith({
      transport: expect.objectContaining({
        serverParams: {
          command: `${mockBasePath}/.venv/bin/python`,
          args: [`${mockBasePath}/main.py`],
          env: {
            OPENAPI_SCHEMA: JSON.stringify({ openapi: '3.1' }),
            AUTH_TOKEN: 'test-auth-token',
            API_BASE_URL: mockApiBaseUrl,
            OPENOPS_MCP_SERVER_PATH: mockBasePath,
            LOGZIO_TOKEN: 'test-logzio-token',
            ENVIRONMENT: 'test-environment',
          },
        },
      }),
    });
    expect(result).toEqual(mockTools);
  });

  it('should return empty object when MCP client creation fails', async () => {
    const mockError = new Error('Test error');
    createMcpClientMock.mockRejectedValue(mockError);

    const result = await getOpenOpsTools(mockApp, 'mock-auth-token');

    expect(result).toEqual({});
    expect(serverSharedMock.logger.error).toHaveBeenCalledWith(
      'Failed to create OpenOps MCP client:',
      mockError,
    );
  });
});
