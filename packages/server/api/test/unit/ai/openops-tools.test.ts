import '@fastify/swagger';
import {
  AppSystemProp,
  logger,
  networkUtls,
  system,
} from '@openops/server-shared';
import { experimental_createMCPClient } from 'ai';
import { FastifyInstance } from 'fastify';
import { getOpenOpsTools } from '../../../src/app/ai/mcp/openops-tools';

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
  system: {
    get: jest.fn(),
  },
  networkUtls: {
    getPublicUrl: jest.fn(),
  },
  AppSystemProp: {
    OPENOPS_MCP_SERVER_PATH: 'OPENOPS_MCP_SERVER_PATH',
  },
}));

jest.mock('ai', () => ({
  experimental_createMCPClient: jest.fn(),
}));

describe('OpenOps Tools', () => {
  const mockApp = {
    swagger: jest.fn().mockReturnValue({ openapi: '3.1' }),
  } as unknown as FastifyInstance;

  const mockAuthToken = 'test-auth-token';
  const mockBasePath = '/test/path';
  const mockApiBaseUrl = 'http://test-api-url';
  const mockTools = {
    tool1: { description: 'Test tool 1', parameters: {} },
    tool2: { description: 'Test tool 2', parameters: {} },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (system.get as jest.Mock).mockReturnValue(mockBasePath);
    (networkUtls.getPublicUrl as jest.Mock).mockResolvedValue(mockApiBaseUrl);
  });

  it('should return empty object when OPENOPS_MCP_SERVER_PATH is not set', async () => {
    (system.get as jest.Mock).mockReturnValue(undefined);

    const result = await getOpenOpsTools(mockApp, mockAuthToken);

    expect(result).toEqual({});
    expect(logger.warn).toHaveBeenCalledWith('OPENOPS_MCP_SERVER_PATH not set');
  });

  it('should create MCP client and return tools when successful', async () => {
    const mockClient = {
      tools: jest.fn().mockResolvedValue(mockTools),
    };
    (experimental_createMCPClient as jest.Mock).mockResolvedValue(mockClient);

    const result = await getOpenOpsTools(mockApp, mockAuthToken);

    expect(experimental_createMCPClient).toHaveBeenCalledWith({
      transport: expect.objectContaining({
        command: expect.stringContaining('python'),
        args: expect.arrayContaining([expect.stringContaining('main.py')]),
        env: {
          OPENAPI_SCHEMA: JSON.stringify({ openapi: '3.1' }),
          AUTH_TOKEN: mockAuthToken,
          API_BASE_URL: mockApiBaseUrl,
          OPENOPS_MCP_SERVER_PATH: mockBasePath,
        },
      }),
    });
    expect(result).toEqual(mockTools);
    expect(logger.info).toHaveBeenCalledWith(
      'Initializing OpenOps MCP client with schema',
    );
  });

  it('should return empty object when MCP client creation fails', async () => {
    const mockError = new Error('Test error');
    (experimental_createMCPClient as jest.Mock).mockRejectedValue(mockError);

    const result = await getOpenOpsTools(mockApp, mockAuthToken);

    expect(result).toEqual({});
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to create OpenOps MCP client:',
      mockError,
    );
  });
});
