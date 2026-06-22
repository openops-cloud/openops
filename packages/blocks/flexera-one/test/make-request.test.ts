import { httpClient, HttpMethod } from '@openops/blocks-common';
import { AxiosError } from 'axios';
import { IAxiosRetryConfig } from 'axios-retry';
import {
  generateAccessToken,
  makeGetRequest,
} from '../src/lib/common/make-request';

jest.mock('@openops/blocks-common', () => ({
  ...jest.requireActual('@openops/blocks-common'),
  httpClient: { sendRequest: jest.fn() },
}));

jest.mock('@openops/server-shared', () => ({
  logger: { info: jest.fn() },
}));

function makeAxiosError(
  status?: number,
  code?: string,
  method = 'get',
): AxiosError {
  const error = new Error('request failed') as AxiosError;
  error.isAxiosError = true;
  error.code = code;
  error.config = { method } as any;
  error.response = status
    ? ({ status, headers: {}, data: {} } as any)
    : undefined;
  return error;
}

const mockAuth = { refreshToken: 'test-refresh-token', appRegion: 'us' };

describe('generateAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (httpClient.sendRequest as jest.Mock).mockResolvedValue({
      body: { access_token: 'test-access-token' },
    });
  });

  test.each([
    ['us', 'https://login.flexera.com/oidc/token'],
    ['eu', 'https://login.flexera.eu/oidc/token'],
    ['apac', 'https://login.flexera.au/oidc/token'],
  ])(
    'calls correct token URL for region %s',
    async (appRegion, expectedUrl) => {
      await generateAccessToken({ refreshToken: 'refresh', appRegion });

      expect(httpClient.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: expectedUrl }),
        expect.anything(),
      );
    },
  );

  test('sends the refresh token in the POST body', async () => {
    await generateAccessToken({
      refreshToken: 'my-refresh-token',
      appRegion: 'us',
    });

    expect(httpClient.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: HttpMethod.POST,
        body: {
          grant_type: 'refresh_token',
          refresh_token: 'my-refresh-token',
        },
      }),
      expect.anything(),
    );
  });

  test('returns the access token from the response', async () => {
    const token = await generateAccessToken(mockAuth);

    expect(token).toBe('test-access-token');
  });

  test('throws on unsupported region', async () => {
    await expect(
      generateAccessToken({ refreshToken: 'refresh', appRegion: 'unknown' }),
    ).rejects.toThrow('Unsupported region: unknown');
  });

  describe('retry config', () => {
    function captureRetryConfig(): IAxiosRetryConfig {
      return (httpClient.sendRequest as jest.Mock).mock.calls[0][1];
    }

    test('retries on 429', async () => {
      await generateAccessToken(mockAuth);
      const { retryCondition } = captureRetryConfig();

      expect(retryCondition!(makeAxiosError(429, undefined, 'post'))).toBe(
        true,
      );
    });

    test('retries on network error regardless of method (ETIMEDOUT)', async () => {
      await generateAccessToken(mockAuth);
      const { retryCondition } = captureRetryConfig();

      expect(
        retryCondition!(makeAxiosError(undefined, 'ETIMEDOUT', 'post')),
      ).toBe(true);
    });

    test('retries on 5xx for the token endpoint', async () => {
      await generateAccessToken(mockAuth);
      const { retryCondition } = captureRetryConfig();

      expect(retryCondition!(makeAxiosError(503, undefined, 'post'))).toBe(
        true,
      );
    });
  });
});

describe('makeGetRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (httpClient.sendRequest as jest.Mock)
      .mockResolvedValueOnce({ body: { access_token: 'test-access-token' } })
      .mockResolvedValueOnce({ body: { data: 'result' } });
  });

  test('fetches an access token then makes the GET request', async () => {
    await makeGetRequest({ ...mockAuth, url: 'https://api.example.com/data' });

    expect(httpClient.sendRequest).toHaveBeenCalledTimes(2);
    expect(httpClient.sendRequest).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ method: HttpMethod.POST }),
      expect.anything(),
    );
    expect(httpClient.sendRequest).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: HttpMethod.GET,
        url: 'https://api.example.com/data',
      }),
      expect.anything(),
    );
  });

  test('returns the response body', async () => {
    const result = await makeGetRequest({
      ...mockAuth,
      url: 'https://api.example.com/data',
    });

    expect(result).toEqual({ data: 'result' });
  });

  test('sets the Authorization header from the access token', async () => {
    await makeGetRequest({ ...mockAuth, url: 'https://api.example.com/data' });

    const getCall = (httpClient.sendRequest as jest.Mock).mock.calls[1];
    expect(getCall[0].headers).toMatchObject({
      Authorization: 'Bearer test-access-token',
    });
  });

  test('merges custom headers with the Authorization header', async () => {
    await makeGetRequest({
      ...mockAuth,
      url: 'https://api.example.com/data',
      headers: { 'Api-Version': '1.0' },
    });

    const getCall = (httpClient.sendRequest as jest.Mock).mock.calls[1];
    expect(getCall[0].headers).toMatchObject({
      Authorization: 'Bearer test-access-token',
      'Api-Version': '1.0',
    });
  });

  describe('retry config', () => {
    function captureGetRetryConfig(): IAxiosRetryConfig {
      return (httpClient.sendRequest as jest.Mock).mock.calls[1][1];
    }

    test('passes a retry config with 3 retries to the GET request', async () => {
      await makeGetRequest({
        ...mockAuth,
        url: 'https://api.example.com/data',
      });

      expect(captureGetRetryConfig()).toMatchObject({ retries: 3 });
    });

    test('retries on 429', async () => {
      await makeGetRequest({
        ...mockAuth,
        url: 'https://api.example.com/data',
      });
      const { retryCondition } = captureGetRetryConfig();

      expect(retryCondition!(makeAxiosError(429, undefined, 'get'))).toBe(true);
    });

    test('retries on network error for GET', async () => {
      await makeGetRequest({
        ...mockAuth,
        url: 'https://api.example.com/data',
      });
      const { retryCondition } = captureGetRetryConfig();

      expect(
        retryCondition!(makeAxiosError(undefined, 'ETIMEDOUT', 'get')),
      ).toBe(true);
    });

    test('does not retry 5xx on POST', async () => {
      await makeGetRequest({
        ...mockAuth,
        url: 'https://api.example.com/data',
      });
      const { retryCondition } = captureGetRetryConfig();

      expect(retryCondition!(makeAxiosError(500, undefined, 'post'))).toBe(
        false,
      );
    });
  });
});
