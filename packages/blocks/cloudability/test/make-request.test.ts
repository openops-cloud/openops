import { httpClient, HttpMethod } from '@openops/blocks-common';
import { logger } from '@openops/server-shared';
import { AxiosError } from 'axios';
import { IAxiosRetryConfig } from 'axios-retry';
import { makeRequest } from '../src/lib/common/make-request';

jest.mock('@openops/blocks-common', () => ({
  ...jest.requireActual('@openops/blocks-common'),
  httpClient: { sendRequest: jest.fn() },
}));

jest.mock('@openops/server-shared', () => ({
  logger: { info: jest.fn() },
}));

const mockAuth = { apiKey: 'key', apiUrl: 'https://api.example.com' };

function captureRetryConfig(): IAxiosRetryConfig {
  const call = (httpClient.sendRequest as jest.Mock).mock.calls[0];
  return call[1] as IAxiosRetryConfig;
}

function makeAxiosError(
  status?: number,
  headers: Record<string, string> = {},
  code?: string,
  method = 'get',
): AxiosError {
  const error = new Error('request failed') as AxiosError;
  error.isAxiosError = true;
  error.code = code;
  error.config = { method } as any;
  error.response = status ? ({ status, headers, data: {} } as any) : undefined;
  return error;
}

describe('makeRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (httpClient.sendRequest as jest.Mock).mockResolvedValue({
      body: { data: 1 },
    });
  });

  test('passes the retry config as the second argument to sendRequest', async () => {
    await makeRequest({
      auth: mockAuth,
      endpoint: '/test',
      method: HttpMethod.GET,
    });

    expect(httpClient.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://api.example.com/test' }),
      expect.objectContaining({ retries: 3 }),
    );
  });

  test('returns the response body', async () => {
    (httpClient.sendRequest as jest.Mock).mockResolvedValue({
      body: { result: 'ok' },
    });
    const result = await makeRequest({
      auth: mockAuth,
      endpoint: '/test',
      method: HttpMethod.GET,
    });
    expect(result).toEqual({ result: 'ok' });
  });

  test('encodes the api key as Basic auth', async () => {
    await makeRequest({
      auth: mockAuth,
      endpoint: '/test',
      method: HttpMethod.GET,
    });

    const encoded = Buffer.from('key:').toString('base64');
    expect(httpClient.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { Authorization: `Basic ${encoded}` },
      }),
      expect.anything(),
    );
  });

  describe('retryCondition', () => {
    test('retries on 429', async () => {
      await makeRequest({
        auth: mockAuth,
        endpoint: '/test',
        method: HttpMethod.GET,
      });
      const { retryCondition } = captureRetryConfig();

      expect(retryCondition!(makeAxiosError(429))).toBe(true);
    });

    test('retries on 5xx', async () => {
      await makeRequest({
        auth: mockAuth,
        endpoint: '/test',
        method: HttpMethod.GET,
      });
      const { retryCondition } = captureRetryConfig();

      expect(retryCondition!(makeAxiosError(500))).toBe(true);
      expect(retryCondition!(makeAxiosError(503))).toBe(true);
    });

    test('does not retry on 4xx (except 429)', async () => {
      await makeRequest({
        auth: mockAuth,
        endpoint: '/test',
        method: HttpMethod.GET,
      });
      const { retryCondition } = captureRetryConfig();

      expect(retryCondition!(makeAxiosError(400))).toBe(false);
      expect(retryCondition!(makeAxiosError(401))).toBe(false);
      expect(retryCondition!(makeAxiosError(404))).toBe(false);
    });

    test('retries on network errors for idempotent methods', async () => {
      await makeRequest({
        auth: mockAuth,
        endpoint: '/test',
        method: HttpMethod.GET,
      });
      const { retryCondition } = captureRetryConfig();

      expect(
        retryCondition!(makeAxiosError(undefined, {}, 'ECONNRESET', 'get')),
      ).toBe(true);
    });

    test('retries 429 on POST (rate limited — request was never processed)', async () => {
      await makeRequest({
        auth: mockAuth,
        endpoint: '/test',
        method: HttpMethod.POST,
      });
      const { retryCondition } = captureRetryConfig();

      expect(retryCondition!(makeAxiosError(429, {}, undefined, 'post'))).toBe(
        true,
      );
    });

    test('does not retry 5xx on POST (non-idempotent side effect)', async () => {
      await makeRequest({
        auth: mockAuth,
        endpoint: '/test',
        method: HttpMethod.POST,
      });
      const { retryCondition } = captureRetryConfig();

      expect(retryCondition!(makeAxiosError(500, {}, undefined, 'post'))).toBe(
        false,
      );
    });
  });

  describe('onRetry', () => {
    test('logs retry count and error details', async () => {
      await makeRequest({
        auth: mockAuth,
        endpoint: '/test',
        method: HttpMethod.GET,
      });
      const { onRetry } = captureRetryConfig();

      const error = makeAxiosError(429, {
        'retry-after': '5',
        'x-ratelimit-remaining': '0',
      });
      onRetry!(2, error, {} as any);

      expect(logger.info).toHaveBeenCalledWith(
        'Retrying HTTP request',
        expect.objectContaining({
          retryCount: 2,
          statusCode: 429,
          retryAfter: '5',
        }),
      );
    });
  });

  describe('retryDelay', () => {
    async function getRetryDelay() {
      await makeRequest({
        auth: mockAuth,
        endpoint: '/test',
        method: HttpMethod.GET,
      });
      return captureRetryConfig().retryDelay!;
    }

    describe('Retry-After header', () => {
      test('returns header value in ms when given as seconds', async () => {
        const retryDelay = await getRetryDelay();
        const error = makeAxiosError(429, { 'retry-after': '30' });
        expect(retryDelay(1, error)).toBe(30_000);
      });

      test('returns ms until the given HTTP date', async () => {
        const retryDelay = await getRetryDelay();
        const futureDate = new Date(Date.now() + 10_000).toUTCString();
        const error = makeAxiosError(429, { 'retry-after': futureDate });
        const delay = retryDelay(1, error);
        // Allow a small window for test execution time
        expect(delay).toBeGreaterThan(9_000);
        expect(delay).toBeLessThanOrEqual(10_000);
      });

      test('uses first value when header is an array', async () => {
        const retryDelay = await getRetryDelay();
        const error = makeAxiosError(429, {
          'retry-after': ['20', '999'],
        } as any);
        expect(retryDelay(1, error)).toBe(20_000);
      });
    });

    describe('429 without Retry-After', () => {
      test('returns short delay with jitter when remaining quota > 5', async () => {
        const retryDelay = await getRetryDelay();
        const error = makeAxiosError(429, { 'x-ratelimit-remaining': '10' });
        const delay = retryDelay(1, error);
        expect(delay).toBeGreaterThanOrEqual(100);
        expect(delay).toBeLessThan(200);
      });

      test('returns ~60s delay when remaining quota is 0', async () => {
        const retryDelay = await getRetryDelay();
        const error = makeAxiosError(429, { 'x-ratelimit-remaining': '0' });
        const delay = retryDelay(1, error);
        expect(delay).toBeGreaterThanOrEqual(60_000);
        expect(delay).toBeLessThan(65_000);
      });

      test('returns ~60s delay when remaining header is absent', async () => {
        const retryDelay = await getRetryDelay();
        const error = makeAxiosError(429);
        const delay = retryDelay(1, error);
        expect(delay).toBeGreaterThanOrEqual(60_000);
        expect(delay).toBeLessThan(65_000);
      });
    });

    describe('non-429 retryable errors', () => {
      test('returns exponential backoff on first retry', async () => {
        const retryDelay = await getRetryDelay();
        const error = makeAxiosError(500);
        const delay = retryDelay(1, error);
        // 200 * 2^0 = 200, plus up to 100 jitter
        expect(delay).toBeGreaterThanOrEqual(200);
        expect(delay).toBeLessThan(300);
      });

      test('doubles the base delay on second retry', async () => {
        const retryDelay = await getRetryDelay();
        const error = makeAxiosError(500);
        const delay = retryDelay(2, error);
        // 200 * 2^1 = 400, plus up to 100 jitter
        expect(delay).toBeGreaterThanOrEqual(400);
        expect(delay).toBeLessThan(500);
      });
    });
  });
});
