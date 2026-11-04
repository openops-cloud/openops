import { httpClient, HttpError, HttpMethod } from '@openops/blocks-common';
import {
  buildQueryString,
  getHostUrl,
  pathSegment,
  sendOptScaleRequest,
  signIn,
  toOptionalInteger,
  toOptScaleError,
} from '../../src/lib/common/make-request';

jest.mock('@openops/blocks-common', () => ({
  ...jest.requireActual('@openops/blocks-common'),
  httpClient: { sendRequest: jest.fn() },
}));

jest.mock('@openops/server-shared', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
}));

const sendRequestMock = httpClient.sendRequest as jest.Mock;

// A new object per test: tokens are cached per auth object.
function makeAuth(baseUrl = 'https://optscale.example.com/') {
  return { baseUrl, email: 'user@example.com', password: 'secret' };
}

function makeHttpError(status: number, data: unknown): HttpError {
  return new HttpError(undefined, {
    response: { status, data, headers: {} },
  } as any);
}

function makeNetworkError(): HttpError {
  // The blocks-common client wraps response-less axios errors like this.
  return new HttpError(undefined, { code: 'ENOTFOUND' } as any);
}

beforeEach(() => {
  jest.clearAllMocks();
  sendRequestMock.mockReset();
});

describe('getHostUrl', () => {
  test('trims whitespace and trailing slashes', () => {
    expect(getHostUrl(makeAuth(' https://optscale.example.com// '))).toBe(
      'https://optscale.example.com',
    );
  });

  test('accepts http hosts without a TLD, such as self-hosted installs', () => {
    expect(getHostUrl(makeAuth('http://localhost:8080'))).toBe(
      'http://localhost:8080',
    );
  });

  test('rejects a URL without a scheme', () => {
    expect(() => getHostUrl(makeAuth('optscale.example.com'))).toThrow(
      'Invalid OptScale URL "optscale.example.com"',
    );
  });

  test('rejects non-http schemes', () => {
    expect(() => getHostUrl(makeAuth('ftp://optscale.example.com'))).toThrow(
      'must start with https:// or http://',
    );
  });
});

describe('signIn', () => {
  test('posts credentials to the auth tokens endpoint and returns the token', async () => {
    sendRequestMock.mockResolvedValue({ body: { token: 'token-1' } });

    await expect(signIn(makeAuth())).resolves.toBe('token-1');
    expect(sendRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: HttpMethod.POST,
        url: 'https://optscale.example.com/auth/v2/tokens',
        body: { email: 'user@example.com', password: 'secret' },
      }),
      expect.objectContaining({ retries: 3 }),
    );
  });

  test('reuses the token for the same connection', async () => {
    sendRequestMock.mockResolvedValue({ body: { token: 'token-1' } });
    const auth = makeAuth();

    await signIn(auth);
    await signIn(auth);

    expect(sendRequestMock).toHaveBeenCalledTimes(1);
  });

  test('signs in again after a failed sign-in', async () => {
    const auth = makeAuth();
    sendRequestMock
      .mockRejectedValueOnce(makeHttpError(503, 'unavailable'))
      .mockResolvedValueOnce({ body: { token: 'token-2' } });

    await expect(signIn(auth)).rejects.toThrow('OptScale API error 503');
    await expect(signIn(auth)).resolves.toBe('token-2');
  });

  test('maps an OptScale auth error to a readable message', async () => {
    sendRequestMock.mockRejectedValue(
      makeHttpError(403, {
        error: {
          status_code: 403,
          error_code: 'OA0037',
          reason: 'Email or password is invalid',
        },
      }),
    );

    await expect(signIn(makeAuth())).rejects.toThrow(
      'OptScale API error 403 OA0037: Email or password is invalid',
    );
  });

  test('reports an unreachable host', async () => {
    sendRequestMock.mockRejectedValue(makeNetworkError());

    await expect(signIn(makeAuth())).rejects.toThrow(
      'Could not reach OptScale at https://optscale.example.com.',
    );
  });

  test('rejects an invalid URL without sending a request', async () => {
    await expect(signIn(makeAuth('optscale.example.com'))).rejects.toThrow(
      'Invalid OptScale URL',
    );
    expect(sendRequestMock).not.toHaveBeenCalled();
  });
});

describe('sendOptScaleRequest', () => {
  function mockTokenThen(...responses: unknown[]) {
    sendRequestMock.mockResolvedValueOnce({ body: { token: 'token-1' } });
    for (const response of responses) {
      if (response instanceof Error) {
        sendRequestMock.mockRejectedValueOnce(response);
      } else {
        sendRequestMock.mockResolvedValueOnce({ body: response });
      }
    }
  }

  test('signs in and sends a bearer-authenticated request to the REST API', async () => {
    mockTokenThen({ result: 'ok' });

    const result = await sendOptScaleRequest({
      auth: makeAuth(),
      method: HttpMethod.GET,
      path: '/organizations',
    });

    expect(result).toEqual({ result: 'ok' });
    expect(sendRequestMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: HttpMethod.GET,
        url: 'https://optscale.example.com/restapi/v2/organizations',
        headers: {
          Authorization: 'Bearer token-1',
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }),
      expect.objectContaining({ retries: 3 }),
    );
  });

  test('signs in once for several requests on the same connection', async () => {
    mockTokenThen({ a: 1 }, { b: 2 });
    const auth = makeAuth();

    await Promise.all([
      sendOptScaleRequest({ auth, method: HttpMethod.GET, path: '/a' }),
      sendOptScaleRequest({ auth, method: HttpMethod.GET, path: '/b' }),
    ]);

    const tokenCalls = sendRequestMock.mock.calls.filter(([request]) =>
      request.url.endsWith('/auth/v2/tokens'),
    );
    expect(tokenCalls).toHaveLength(1);
  });

  test('drops the cached token after a 401', async () => {
    const auth = makeAuth();
    mockTokenThen(makeHttpError(401, { error: { reason: 'Unauthorized' } }));
    mockTokenThen({ ok: true });

    await expect(
      sendOptScaleRequest({ auth, method: HttpMethod.GET, path: '/a' }),
    ).rejects.toThrow('OptScale API error 401: Unauthorized');
    await expect(
      sendOptScaleRequest({ auth, method: HttpMethod.GET, path: '/a' }),
    ).resolves.toEqual({ ok: true });

    expect(sendRequestMock).toHaveBeenCalledTimes(4);
  });

  test('serialises array query values as repeated keys', async () => {
    mockTokenThen({});

    await sendOptScaleRequest({
      auth: makeAuth(),
      method: HttpMethod.GET,
      path: '/organizations/org-1/optimizations',
      query: { type: ['a', 'b'], limit: 5 },
    });

    expect(sendRequestMock.mock.calls[1][0].url).toBe(
      'https://optscale.example.com/restapi/v2/organizations/org-1/optimizations?type=a&type=b&limit=5',
    );
  });

  test('passes the body through', async () => {
    mockTokenThen({});

    await sendOptScaleRequest({
      auth: makeAuth(),
      method: HttpMethod.PATCH,
      path: '/pools/pool-1',
      body: { limit: 100 },
    });

    expect(sendRequestMock.mock.calls[1][0]).toMatchObject({
      method: HttpMethod.PATCH,
      body: { limit: 100 },
    });
  });

  test('maps REST API errors', async () => {
    mockTokenThen(
      makeHttpError(424, {
        error: {
          status_code: 424,
          error_code: 'OE0445',
          reason: "Organization doesn't have any cloud accounts connected",
        },
      }),
    );

    await expect(
      sendOptScaleRequest({
        auth: makeAuth(),
        method: HttpMethod.GET,
        path: '/organizations/org-1/clean_expenses',
      }),
    ).rejects.toThrow(
      "OptScale API error 424 OE0445: Organization doesn't have any cloud accounts connected",
    );
  });
});

describe('buildQueryString', () => {
  test('returns an empty string without query values', () => {
    expect(buildQueryString()).toBe('');
    expect(buildQueryString({ a: undefined, b: null, c: '' })).toBe('');
  });

  test('keeps booleans and numbers', () => {
    expect(buildQueryString({ details: true, limit: 0 })).toBe(
      '?details=true&limit=0',
    );
  });

  test('encodes special characters', () => {
    expect(buildQueryString({ tag: 'team:a b' })).toBe('?tag=team%3Aa+b');
  });
});

describe('pathSegment', () => {
  test('trims and encodes path delimiters', () => {
    expect(pathSegment(' abc/../x?y#z ')).toBe('abc%2F..%2Fx%3Fy%23z');
  });
});

describe('toOptScaleError', () => {
  const url = 'https://optscale.example.com/restapi/v2';

  test('falls back to the raw body when it is not an OptScale error', () => {
    expect(
      toOptScaleError(makeHttpError(502, 'Bad Gateway'), url).message,
    ).toBe('OptScale API error 502: "Bad Gateway"');
  });

  test('omits a missing error code', () => {
    expect(
      toOptScaleError(
        makeHttpError(400, { error: { reason: 'Bad input' } }),
        url,
      ).message,
    ).toBe('OptScale API error 400: Bad input');
  });

  test('reports requests without a response as unreachable', () => {
    expect(toOptScaleError(makeNetworkError(), url).message).toBe(
      `Could not reach OptScale at ${url}. Check the OptScale URL and that the host is reachable.`,
    );
  });

  test('returns plain errors unchanged', () => {
    const error = new Error('network down');
    expect(toOptScaleError(error, url)).toBe(error);
    expect(toOptScaleError('oops', url).message).toBe('oops');
  });
});

describe('toOptionalInteger', () => {
  test('passes through missing values', () => {
    expect(toOptionalInteger(undefined, 'Limit', 1)).toBeUndefined();
    expect(toOptionalInteger(null, 'Limit', 1)).toBeUndefined();
  });

  test('accepts whole numbers at or above the minimum', () => {
    expect(toOptionalInteger(0, 'Offset', 0)).toBe(0);
    expect(toOptionalInteger(5, 'Limit', 1)).toBe(5);
  });

  test.each([0, -1, 2.5])('rejects %p for a minimum of 1', (value) => {
    expect(() => toOptionalInteger(value, 'Limit', 1)).toThrow(
      'Limit must be a whole number of at least 1',
    );
  });
});
