import { ExecutionType } from '@openops/shared';
import { graphqlAction } from '../src/lib/graphql-action';

describe('GraphQL Action', () => {
  const mockApiKey = 'test-api-key';
  const mockAccessToken = 'test-access-token';
  const mockQuery = '{ test { id } }';
  const mockVariables = { id: '123' };

  const mockContext = {
    propsValue: {
      query: mockQuery,
      variables: mockVariables,
    },
    auth: mockApiKey,
    flows: {
      current: {
        id: 'test-flow-id',
        version: {
          id: 'test-version-id',
        },
      },
    },
    store: {
      put: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      id: 'test-project-id',
    },
    executionType: ExecutionType.RESUME as const,
    connections: {
      get: jest.fn(),
      list: jest.fn(),
    },
    tags: {
      get: jest.fn(),
      set: jest.fn(),
      add: jest.fn(),
    },
    server: {
      apiUrl: 'http://localhost:3000',
      publicUrl: 'http://localhost:3000',
      token: 'test-token',
    },
    files: {
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      write: jest.fn(),
    },
    serverUrl: 'http://localhost:3000',
    run: {
      id: 'test-run-id',
      name: 'Test Run',
      pauseId: 'test-pause-id',
      stop: jest.fn(),
      pause: jest.fn(),
      isTest: true,
    },
    generateResumeUrl: jest.fn(),
    currentExecutionPath: '/test/path',
    resumePayload: {
      body: {},
      headers: {},
      queryParams: {},
    },
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should successfully execute a GraphQL query', async () => {
    const mockResponse = {
      data: { test: { id: '123' } },
    };

    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: { loginAPI: { accessToken: mockAccessToken } },
            }),
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

    const result = await graphqlAction.run(mockContext);

    expect(result).toEqual(mockResponse.data);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle GraphQL errors', async () => {
    const mockError = {
      errors: [{ message: 'Invalid query' }],
    };

    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: { loginAPI: { accessToken: mockAccessToken } },
            }),
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockError),
        }),
      );

    await expect(graphqlAction.run(mockContext)).rejects.toThrow(
      'GraphQL Error: Invalid query',
    );
  });

  it('should handle invalid API key', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({ errors: [{ message: 'Invalid API key' }] }),
      }),
    );

    await expect(graphqlAction.run(mockContext)).rejects.toThrow(
      'Invalid API key or login failed',
    );
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: { loginAPI: { accessToken: mockAccessToken } },
            }),
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Network Error',
        }),
      );

    await expect(graphqlAction.run(mockContext)).rejects.toThrow(
      'GraphQL request failed: Network Error',
    );
  });
});
