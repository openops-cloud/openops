/**
 * RFC 6749 §5.2 error responses. The OpenOps `ApplicationError` envelope is not
 * wire-compatible with OAuth clients, which branch on the `error` code to decide
 * whether to retry, re-authorize, or discard a stored credential.
 */
export class OAuthError extends Error {
  constructor(
    public readonly errorCode: string,
    public readonly description: string,
    public readonly statusCode = 400,
  ) {
    super(`${errorCode}: ${description}`);
    this.name = 'OAuthError';
  }

  toBody(): { error: string; error_description: string } {
    return { error: this.errorCode, error_description: this.description };
  }
}

export const invalidRequest = (description: string): OAuthError =>
  new OAuthError('invalid_request', description);

export const invalidClient = (description: string): OAuthError =>
  new OAuthError('invalid_client', description, 401);

export const invalidGrant = (description: string): OAuthError =>
  new OAuthError('invalid_grant', description);

export const invalidTarget = (description: string): OAuthError =>
  new OAuthError('invalid_target', description);

export const unsupportedGrantType = (description: string): OAuthError =>
  new OAuthError('unsupported_grant_type', description);

export const unauthorizedClient = (description: string): OAuthError =>
  new OAuthError('unauthorized_client', description);

export const invalidClientMetadata = (description: string): OAuthError =>
  new OAuthError('invalid_client_metadata', description);

export const invalidRedirectUri = (description: string): OAuthError =>
  new OAuthError('invalid_redirect_uri', description);

export const serverError = (description: string): OAuthError =>
  new OAuthError('server_error', description, 500);
