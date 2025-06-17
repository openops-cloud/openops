import { graphqlAction } from '../src/lib/graphql-action';

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
});
