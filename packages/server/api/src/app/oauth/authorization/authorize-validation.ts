import { invalidRequest } from '../common/oauth-errors';
import {
  RegisteredResource,
  resolveResource,
} from '../discovery/resource-registry';
import { OAuthClient } from '../storage/oauth-model';
import { isValidCodeChallenge } from './pkce';
import { matchesRegisteredRedirectUri } from './redirect-uri';

// `qs` turns `state[x]=1` into an object, so every field is read through `readParam`
// rather than assumed to be a string.
export type AuthorizeQuery = Record<string, unknown>;

export type OAuthRequestBody = Record<string, unknown>;

// `state` is opaque client data that must round-trip byte for byte, so it is capped only
// to bound how much a single request can write.
const MAX_STATE_LENGTH = 2048;

export function readParam(
  query: AuthorizeQuery,
  name: string,
): string | undefined {
  const value = query[name];
  return typeof value === 'string' ? value : undefined;
}

// A non-string value is malformed input, not an omission: defaulting it would give the
// client something other than what it asked for.
function findMalformedParam(query: AuthorizeQuery): string | undefined {
  return Object.keys(query).find(
    (name) => query[name] !== undefined && typeof query[name] !== 'string',
  );
}

export type AuthorizeValidationResult =
  | { kind: 'render_error'; error: string; description: string }
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
 * Callers must not redirect for a `render_error`: the supplied redirect target is
 * untrusted there, so following it would make this endpoint an open redirector.
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

  // De-duplicated: a repeated scope passes the subset check below while inflating the
  // stored value without limit.
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
