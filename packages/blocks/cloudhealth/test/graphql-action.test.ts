import { graphqlAction } from '../src/lib/actions/graphql-action';

describe('GraphQL Action', () => {
  const mockApiKey = 'test-api-key';
  const mockAccessToken = 'test-access-token';
  const mockQuery = '{ test { id } }';
  const mockVariables = { id: '123' };

  const mockContext = {
    ...jest.requireActual('@openops/blocks-framework'),
    auth: mockApiKey,
    propsValue: {
      query: mockQuery,
      variables: mockVariables,
    },
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
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

  it('should handle GraphQL errors with HTTP 200', async () => {
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

  it('should handle HTTP errors with GraphQL errors (prioritize GraphQL errors)', async () => {
    const mockError = {
      errors: [
        { message: 'Cannot query field "nonExistentField" on type "Query".' },
      ],
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
          ok: false,
          statusText: 'Bad Request',
          json: () => Promise.resolve(mockError),
        }),
      );

    await expect(graphqlAction.run(mockContext)).rejects.toThrow(
      'GraphQL Error: Cannot query field "nonExistentField" on type "Query".\n | GraphQL request failed.\nRequest: {"query":"{ test { id } }","variables":{"id":"123"}}.\nResponse: Bad Request',
    );
  });

  it('should handle HTTP errors without GraphQL errors', async () => {
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
          statusText: 'Unauthorized',
          json: () => Promise.resolve({}),
        }),
      );

    await expect(graphqlAction.run(mockContext)).rejects.toThrow(
      'GraphQL request failed.\nRequest: {"query":"{ test { id } }","variables":{"id":"123"}}.\nResponse: Unauthorized',
    );
  });

  it('should handle multiple GraphQL errors with pipe separator', async () => {
    const mockError = {
      errors: [
        { message: 'Cannot query field "nonExistentField" on type "Query".' },
        {
          message:
            'Cannot query field "accounts" on type "Query". Did you mean "awsAccounts"?',
        },
      ],
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
      'GraphQL Error: Cannot query field "nonExistentField" on type "Query".\n | Cannot query field "accounts" on type "Query". Did you mean "awsAccounts"?\n',
    );
  });

  it('should handle invalid API key during login', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ errors: [{ message: 'Invalid API key' }] }),
      }),
    );

    await expect(graphqlAction.run(mockContext)).rejects.toThrow(
      'Invalid API key or login failed',
    );
  });
});
