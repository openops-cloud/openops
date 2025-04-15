import { makeHttpRequest } from '@openops/common';
import { getDatabricksToken } from '../src/lib/common/get-databricks-token';

jest.mock('@openops/common', () => ({
  makeHttpRequest: jest.fn(),
}));

const makeHttpRequestMock = makeHttpRequest as jest.Mock;

const auth = {
  accountId: 'test-account-id',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
};

describe('getDatabricksToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return access token on successful request', async () => {
    makeHttpRequestMock.mockResolvedValue({
      access_token: 'mock-token',
      expires_in: 3600,
      token_type: 'Bearer',
    });

    const token = await getDatabricksToken(auth);

    expect(token).toBe('mock-token');
    expect(makeHttpRequestMock).toHaveBeenCalledWith(
      'POST',
      `https://accounts.cloud.databricks.com/oidc/accounts/${auth.accountId}/v1/token`,
      expect.anything(), // headers
      'grant_type=client_credentials&scope=all-apis',
    );

    const headers = makeHttpRequestMock.mock.calls[0][2];
    expect(headers.get('Authorization')).toBe(
      `Basic ${Buffer.from(`${auth.clientId}:${auth.clientSecret}`).toString(
        'base64',
      )}`,
    );
    expect(headers.get('Content-Type')).toBe(
      'application/x-www-form-urlencoded',
    );
  });

  test('should throw an error if makeHttpRequest fails', async () => {
    makeHttpRequestMock.mockRejectedValue(new Error('Request failed'));

    await expect(getDatabricksToken(auth)).rejects.toThrow('Request failed');
  });
});
