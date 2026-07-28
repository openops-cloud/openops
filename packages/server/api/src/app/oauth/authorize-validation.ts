import { invalidRequest } from './oauth-errors';
import { OAuthClient } from './oauth-model';
import { isValidCodeChallenge } from './pkce';
import { matchesRegisteredRedirectUri } from './redirect-uri';
import { RegisteredResource, resolveResource } from './resource-registry';

/**
 * Query parameters arrive unvalidated, and a form-encoded parser can turn
 * `state[x]=1` into an object, so every field is read through {@link readParam}
 * rather than assumed to be a string.
 */
export type AuthorizeQuery = Record<string, unknown>;

/** Same reasoning for form-encoded bodies on the token and revocation endpoints. */
export type OAuthRequestBody = Record<string, unknown>;

/**
 * `state` is opaque client data that has to round-trip byte for byte — clients
 * legitimately put signed blobs in it — so it is stored unbounded and capped only
 * to keep a single request from being used to write arbitrary amounts.
 */
const MAX_STATE_LENGTH = 2048;

export function readParam(
  query: AuthorizeQuery,
  name: string,
): string | undefined {
  const value = query[name];
  return typeof value === 'string' ? value : undefined;
}

/**
 * A query or form parser turns `scope[x]=1` into an object. Such a value is
 * malformed input, not an omission: substituting a default for it would give the
 * client something other than what it asked for without telling it.
 */
function findMalformedParam(query: AuthorizeQuery): string | undefined {
  return Object.keys(query).find(
    (name) => query[name] !== undefined && typeof query[name] !== 'string',
  );
}

export type AuthorizeValidationResult =
  /** The redirect target cannot be trusted; show the error instead. */
  | { kind: 'render_error'; error: string; description: string }
  /**
   * The client and its redirect_uri are known good, so the error belongs back at
   * the client. Carries the validated destination so the caller never re-reads
   * the raw query to build it.
   */
  | {
      kind: 'redirect_error';
      error: string;
      description: string;
      redirectUri: string;
      state: string | null;
    }
  | {
      kind: 'ok';
      resource: RegisteredResource;
      scope: string;
      redirectUri: string;
      codeChallenge: string;
      state: string | null;
    };

/**
 * Validates an authorize request once, up front, and returns the validated values
 * so nothing downstream re-reads the raw query.
 *
 * Callers must not redirect for a `render_error`: an unknown client or an
 * unregistered redirect_uri means the supplied redirect target cannot be trusted,
 * so sending the browser there would turn this endpoint into an open redirector.
 */
export function validateAuthorizeRequest(
  query: AuthorizeQuery,
  client: OAuthClient | null,
): AuthorizeValidationResult {
  if (!client) {
    return {
      kind: 'render_error',
      error: 'invalid_client',
      description: 'Unknown client.',
    };
  }

  const redirectUri = readParam(query, 'redirect_uri');

  if (
    !redirectUri ||
    !matchesRegisteredRedirectUri(client.redirectUris, redirectUri)
  ) {
    return {
      kind: 'render_error',
      error: 'invalid_request',
      description: 'The redirect_uri does not match a registered value.',
    };
  }

  const malformedParam = findMalformedParam(query);

  if (malformedParam !== undefined) {
    return {
      kind: 'redirect_error',
      error: 'invalid_request',
      description: `${malformedParam} must be a single string value.`,
      redirectUri,
      state: null,
    };
  }

  const state = readParam(query, 'state');

  if (state !== undefined && state.length > MAX_STATE_LENGTH) {
    return {
      kind: 'redirect_error',
      error: 'invalid_request',
      description: `state must be at most ${MAX_STATE_LENGTH} characters.`,
      redirectUri,
      state: null,
    };
  }

  if (readParam(query, 'response_type') !== 'code') {
    return {
      kind: 'redirect_error',
      error: 'unsupported_response_type',
      description: 'Only the authorization code flow is supported.',
      redirectUri,
      state: state ?? null,
    };
  }

  // PKCE is mandatory in OAuth 2.1, and only S256 is accepted.
  if (readParam(query, 'code_challenge_method') !== 'S256') {
    return {
      kind: 'redirect_error',
      error: 'invalid_request',
      description: 'code_challenge_method must be S256.',
      redirectUri,
      state: state ?? null,
    };
  }

  const codeChallenge = readParam(query, 'code_challenge');

  if (!codeChallenge || !isValidCodeChallenge(codeChallenge)) {
    return {
      kind: 'redirect_error',
      error: 'invalid_request',
      description: 'A valid S256 code_challenge is required.',
      redirectUri,
      state: state ?? null,
    };
  }

  const requestedResource = readParam(query, 'resource');

  if (!requestedResource) {
    return {
      kind: 'redirect_error',
      error: 'invalid_target',
      description: 'The resource parameter is required.',
      redirectUri,
      state: state ?? null,
    };
  }

  const resource = resolveResource(requestedResource);

  if (!resource) {
    return {
      kind: 'redirect_error',
      error: 'invalid_target',
      description: 'Unknown resource.',
      redirectUri,
      state: state ?? null,
    };
  }

  // De-duplicated because a repeated scope passes the subset check below while
  // inflating the stored value without limit.
  const requestedScopes = [
    ...new Set(
      (readParam(query, 'scope') ?? resource.scopes.join(' '))
        .split(' ')
        .filter((scope) => scope.length > 0),
    ),
  ];

  if (!requestedScopes.every((scope) => resource.scopes.includes(scope))) {
    return {
      kind: 'redirect_error',
      error: 'invalid_scope',
      description: 'The requested scope is not available for this resource.',
      redirectUri,
      state: state ?? null,
    };
  }

  return {
    kind: 'ok',
    resource,
    scope: requestedScopes.join(' '),
    redirectUri,
    codeChallenge,
    state: state ?? null,
  };
}

/**
 * The form-encoded body is parsed with `qs`, so `code[x]=1` arrives as an object.
 * Requiring an actual string keeps a malformed value from reaching code that
 * expects one and surfacing as a 500 rather than an RFC 6749 error.
 */
export function requireParam(body: OAuthRequestBody, name: string): string {
  const value = body[name];

  if (typeof value !== 'string' || value.length === 0) {
    throw invalidRequest(`${name} is required`);
  }

  return value;
}

export function optionalParam(
  body: OAuthRequestBody,
  name: string,
): string | undefined {
  const value = body[name];
  return typeof value === 'string' ? value : undefined;
}
