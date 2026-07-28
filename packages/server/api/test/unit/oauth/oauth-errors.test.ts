import {
  invalidClient,
  invalidGrant,
  invalidRequest,
  invalidTarget,
  OAuthError,
  serverError,
} from '../../../src/app/oauth/oauth-errors';

describe('OAuthError', () => {
  it('carries RFC 6749 fields and a 400 status by default', () => {
    const error = invalidGrant('code expired');

    expect(error).toBeInstanceOf(OAuthError);
    expect(error.toBody()).toEqual({
      error: 'invalid_grant',
      error_description: 'code expired',
    });
    expect(error.statusCode).toBe(400);
  });

  it('uses 401 for invalid_client', () => {
    expect(invalidClient('bad credentials').statusCode).toBe(401);
  });

  it('uses 500 for server_error', () => {
    expect(serverError('signing key missing').statusCode).toBe(500);
  });

  it('uses 400 for invalid_request and invalid_target', () => {
    expect(invalidRequest('missing code').statusCode).toBe(400);
    expect(invalidTarget('unknown resource').statusCode).toBe(400);
  });

  it('is throwable and catchable as an Error', () => {
    expect(() => {
      throw invalidRequest('boom');
    }).toThrow('invalid_request: boom');
  });
});
