import { httpClient, HttpError, HttpMethod } from '@openops/blocks-common';
import {
  buildQueryString,
  sendOptScaleRequest,
  signIn,
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

const auth = {
  baseUrl: 'https://optscale.example.com/',
  email: 'user@example.com',
  password: 'secret',
};

function makeHttpError(status: number, data: unknown): HttpError {
  return new HttpError(undefined, {
    response: { status, data, headers: {} },
  } as any);
}

describe('signIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('posts credentials to the auth tokens endpoint and returns the token', async () => {
    sendRequestMock.mockResolvedValue({ body: { token: 'token-1' } });

    const token = await signIn(auth);

    expect(token).toBe('token-1');
    expect(sendRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: HttpMethod.POST,
        url: 'https://optscale.example.com/auth/v2/tokens',
        body: { email: 'user@example.com', password: 'secret' },
      }),
      expect.objectContaining({ retries: 3 }),
    );
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

    await expect(signIn(auth)).rejects.toThrow(
      'OptScale API error 403 OA0037: Email or password is invalid',
    );
  });
});

describe('sendOptScaleRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendRequestMock
      .mockResolvedValueOnce({ body: { token: 'token-1' } })
      .mockResolvedValueOnce({ body: { result: 'ok' } });
  });

  test('signs in and sends a bearer-authenticated request to the REST API', async () => {
    const result = await sendOptScaleRequest({
      auth,
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

  test('serialises array query values as repeated keys', async () => {
    await sendOptScaleRequest({
      auth,
      method: HttpMethod.GET,
      path: '/organizations/org-1/optimizations',
      query: { type: ['a', 'b'], limit: 5 },
    });

    expect(sendRequestMock.mock.calls[1][0].url).toBe(
      'https://optscale.example.com/restapi/v2/organizations/org-1/optimizations?type=a&type=b&limit=5',
    );
  });

  test('passes the body through', async () => {
    await sendOptScaleRequest({
      auth,
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
    sendRequestMock.mockReset();
    sendRequestMock
      .mockResolvedValueOnce({ body: { token: 'token-1' } })
      .mockRejectedValueOnce(
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
        auth,
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

describe('toOptScaleError', () => {
  test('falls back to the raw body when it is not an OptScale error', () => {
    expect(toOptScaleError(makeHttpError(502, 'Bad Gateway')).message).toBe(
      'OptScale API error 502: "Bad Gateway"',
    );
  });

  test('omits a missing error code', () => {
    expect(
      toOptScaleError(makeHttpError(400, { error: { reason: 'Bad input' } }))
        .message,
    ).toBe('OptScale API error 400: Bad input');
  });

  test('returns plain errors unchanged', () => {
    const error = new Error('network down');
    expect(toOptScaleError(error)).toBe(error);
    expect(toOptScaleError('oops').message).toBe('oops');
  });
});
