import crypto from 'node:crypto';
import {
  AuthorizeQuery,
  validateAuthorizeRequest,
} from '../../../src/app/oauth/authorize-validation';
import { oauthConfig } from '../../../src/app/oauth/oauth-config';
import { OAuthClient } from '../../../src/app/oauth/oauth-model';

const API_URI = 'https://ops.example.com/api';
const MCP_URI = 'https://ops.example.com/mcp';
const REGISTERED = 'https://client.example/cb';
const CHALLENGE = crypto
  .createHash('sha256')
  .update('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')
  .digest('base64url');

const CLIENT: OAuthClient = {
  id: 'client-1',
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  clientName: 'Claude Code',
  redirectUris: [REGISTERED, 'http://127.0.0.1:1234/callback'],
  grantTypes: ['authorization_code', 'refresh_token'],
  tokenEndpointAuthMethod: 'none',
  clientSecretHash: null,
  scope: '',
};

function query(overrides: Record<string, unknown> = {}): AuthorizeQuery {
  return {
    client_id: 'client-1',
    redirect_uri: REGISTERED,
    response_type: 'code',
    code_challenge: CHALLENGE,
    code_challenge_method: 'S256',
    resource: MCP_URI,
    ...overrides,
  };
}

describe('validateAuthorizeRequest', () => {
  beforeEach(() => {
    jest.spyOn(oauthConfig, 'getApiAudience').mockReturnValue(API_URI);
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(MCP_URI);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts a well-formed request and returns the validated values', () => {
    expect(validateAuthorizeRequest(query({ state: 'xyz' }), CLIENT)).toEqual({
      kind: 'ok',
      resource: expect.objectContaining({ id: 'mcp', canonicalUri: MCP_URI }),
      scope: 'mcp',
      redirectUri: REGISTERED,
      codeChallenge: CHALLENGE,
      state: 'xyz',
    });
  });

  it('defaults the scope to what the resource offers', () => {
    const result = validateAuthorizeRequest(query(), CLIENT);

    expect(result).toMatchObject({ kind: 'ok', scope: 'mcp', state: null });
  });

  describe('refuses to redirect when the destination cannot be trusted', () => {
    // This is the open-redirect boundary: a `render_error` must never be turned
    // into a redirect by the caller.
    it('renders rather than redirects for an unknown client', () => {
      expect(validateAuthorizeRequest(query(), null)).toEqual({
        kind: 'render_error',
        error: 'invalid_client',
        description: 'Unknown client.',
      });
    });

    it.each([
      ['an unregistered destination', 'https://attacker.example/steal'],
      ['a path the client did not register', 'https://client.example/other'],
      ['userinfo smuggled in', 'https://user:pass@client.example/cb'],
      ['a fragment appended', `${REGISTERED}#tail`],
      ['a missing value', undefined],
      ['a non-string value', { evil: true }],
    ])('renders rather than redirects for %s', (_label, redirectUri) => {
      const result = validateAuthorizeRequest(
        query({ redirect_uri: redirectUri }),
        CLIENT,
      );

      expect(result.kind).toBe('render_error');
    });
  });

  describe('redirects the error back to the client once the destination is known good', () => {
    it.each([
      [
        'a missing response_type',
        { response_type: undefined },
        'unsupported_response_type',
      ],
      [
        'an implicit response_type',
        { response_type: 'token' },
        'unsupported_response_type',
      ],
      ['no PKCE challenge', { code_challenge: undefined }, 'invalid_request'],
      [
        'a malformed PKCE challenge',
        { code_challenge: 'too-short' },
        'invalid_request',
      ],
      [
        'a plain PKCE method',
        { code_challenge_method: 'plain' },
        'invalid_request',
      ],
      [
        'a missing PKCE method',
        { code_challenge_method: undefined },
        'invalid_request',
      ],
      ['no resource', { resource: undefined }, 'invalid_target'],
      [
        'an unknown resource',
        { resource: 'https://elsewhere.example' },
        'invalid_target',
      ],
      [
        'a scope the resource does not offer',
        { scope: 'api' },
        'invalid_scope',
      ],
      ['an unknown scope', { scope: 'admin' }, 'invalid_scope'],
    ])('%s', (_label, overrides, expectedError) => {
      const result = validateAuthorizeRequest(query(overrides), CLIENT);

      expect(result).toMatchObject({
        kind: 'redirect_error',
        error: expectedError,
        redirectUri: REGISTERED,
      });
    });

    it('rejects an oversized state instead of letting it reach storage', () => {
      const result = validateAuthorizeRequest(
        query({ state: 's'.repeat(2049) }),
        CLIENT,
      );

      expect(result).toMatchObject({
        kind: 'redirect_error',
        error: 'invalid_request',
      });
      // Not echoed back, since the value is what was rejected.
      expect(result).toMatchObject({ state: null });
    });

    it('accepts a large but permitted state, because clients put blobs there', () => {
      const state = 's'.repeat(2048);

      expect(validateAuthorizeRequest(query({ state }), CLIENT)).toMatchObject({
        kind: 'ok',
        state,
      });
    });

    it('echoes the state alongside the error so the client can correlate it', () => {
      const result = validateAuthorizeRequest(
        query({ response_type: 'token', state: 'correlate-me' }),
        CLIENT,
      );

      expect(result).toMatchObject({
        kind: 'redirect_error',
        state: 'correlate-me',
      });
    });
  });

  describe('non-string parameters', () => {
    // A form/query parser can turn `scope[x]=1` into an object; treating that as
    // a string would reach the database and surface as a 500.
    it.each([
      ['response_type', { response_type: ['code'] }],
      ['code_challenge', { code_challenge: { v: CHALLENGE } }],
      ['code_challenge_method', { code_challenge_method: ['S256'] }],
      ['resource', { resource: { v: MCP_URI } }],
      ['scope', { scope: ['mcp'] }],
    ])(
      'rejects a structured %s rather than substituting a default',
      (_l, o) => {
        const result = validateAuthorizeRequest(query(o), CLIENT);

        expect(result.kind).toBe('redirect_error');
      },
    );

    it('rejects a structured state rather than storing or ignoring it', () => {
      const result = validateAuthorizeRequest(
        query({ state: { evil: true } }),
        CLIENT,
      );

      expect(result).toMatchObject({
        kind: 'redirect_error',
        error: 'invalid_request',
      });
    });
  });

  it('collapses duplicate scopes so a repeat cannot inflate what is stored', () => {
    const result = validateAuthorizeRequest(
      query({ scope: Array(60).fill('mcp').join(' ') }),
      CLIENT,
    );

    expect(result).toMatchObject({ kind: 'ok', scope: 'mcp' });
  });

  it('matches a loopback redirect on any port, as native clients require', () => {
    const result = validateAuthorizeRequest(
      query({ redirect_uri: 'http://127.0.0.1:59999/callback' }),
      CLIENT,
    );

    expect(result).toMatchObject({
      kind: 'ok',
      redirectUri: 'http://127.0.0.1:59999/callback',
    });
  });
});
