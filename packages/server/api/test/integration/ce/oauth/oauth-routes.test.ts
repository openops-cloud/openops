/*
 * Route-level behaviour of the OAuth endpoints.
 *
 * Everything else about this module is covered by unit tests against the services. What
 * only appears once the real app is running is the HTTP contract: which principal each
 * route admits, the anti-CSRF header, cache headers, the RFC 6749 error envelope, and the
 * open-redirect boundary on `/authorize`. `securityHandlerChain` is a global `preHandler`
 * registered by `setupApp`, so a hand-built Fastify instance would enforce none of it and
 * these assertions would pass while testing nothing.
 *
 * The boot guard refuses SQLite because the migration is Postgres-only — but this
 * environment sets `OPS_DB_SYNCHRONIZE_SCHEMA`, so TypeORM builds the tables from the
 * entities and the premise does not hold here. The guard is stubbed for that reason
 * alone; it has its own tests in `test/unit/oauth/oauth-config-validation.test.ts`.
 */
jest.mock('../../../../src/app/oauth/oauth-config-validation', () => ({
  validateOAuthConfiguration: jest.fn(),
}));

import { encryptUtils } from '@openops/server-shared';
import { PrincipalType } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { setupServer } from '../../../../src/app/server';
import { generateMockToken } from '../../../helpers/auth';

let app: FastifyInstance | null = null;

const REGISTERED_REDIRECT = 'http://127.0.0.1:41100/callback';
const CODE_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

async function registerClient(): Promise<string> {
  const response = await app!.inject({
    method: 'POST',
    url: '/v1/oauth/register',
    body: {
      client_name: 'Route Test Client',
      redirect_uris: [REGISTERED_REDIRECT],
    },
  });

  return response.json().client_id;
}

function authorizeUrl(params: Record<string, string>): string {
  return `/v1/oauth/authorize?${new URLSearchParams(params).toString()}`;
}

/*
 * Set for this suite only, and put back afterwards.
 *
 * Jest reuses a worker across files, so `process.env` outlives this one. Leaving OAuth
 * enabled would make a later suite boot the module with the real config guard — which
 * refuses SQLite — and fail for reasons that have nothing to do with it.
 */
const OVERRIDES: Record<string, string> = {
  OPS_OAUTH_ENABLED: 'true',
  OPS_OAUTH_ISSUER_URL: 'http://localhost:3000',
  OPS_MCP_RESOURCE_URL: 'http://localhost:3020/mcp',
  OPS_OAUTH_RS_CLIENT_SECRET: 'r'.repeat(32),
};

const previousEnv = new Map<string, string | undefined>();

beforeAll(async () => {
  for (const [key, value] of Object.entries(OVERRIDES)) {
    previousEnv.set(key, process.env[key]);
    process.env[key] = value;
  }

  encryptUtils.loadEncryptionKey();
  await databaseConnection().initialize();
  app = await setupServer();
});

afterAll(async () => {
  await app?.close();
  await databaseConnection().destroy();

  for (const [key, value] of previousEnv) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('OAuth routes', () => {
  describe('principal boundaries', () => {
    it('refuses a SERVICE principal on the connected-apps list', async () => {
      const token = await generateMockToken({ type: PrincipalType.SERVICE });

      const response = await app!.inject({
        method: 'GET',
        url: '/v1/oauth/grants',
        headers: { authorization: `Bearer ${token}` },
      });

      // Managing connections is something a user does in a browser. A connection must
      // not be able to enumerate — or revoke — its siblings.
      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN);
    });

    it('refuses a SERVICE principal on revocation', async () => {
      const token = await generateMockToken({ type: PrincipalType.SERVICE });

      const response = await app!.inject({
        method: 'DELETE',
        url: '/v1/oauth/grants/some-grant-id',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN);
    });

    it('admits a SERVICE principal on the projects list', async () => {
      const token = await generateMockToken({ type: PrincipalType.SERVICE });

      const response = await app!.inject({
        method: 'GET',
        url: '/v1/oauth/projects',
        headers: { authorization: `Bearer ${token}` },
      });

      // The one route a connection calls about itself, to learn where it may switch to.
      // Deliberately open to SERVICE; the two above are deliberately not.
      expect(response.statusCode).not.toBe(StatusCodes.FORBIDDEN);
    });

    it('refuses an unauthenticated caller on the connected-apps list', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/v1/oauth/grants',
      });

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });
  });

  describe('consent decision', () => {
    it('refuses a decision that carries no anti-CSRF header', async () => {
      const token = await generateMockToken({ type: PrincipalType.USER });

      const response = await app!.inject({
        method: 'POST',
        url: '/v1/oauth/requests/any-request-id/decision',
        headers: { authorization: `Bearer ${token}` },
        body: { approve: true },
      });

      // A cross-site form post cannot set a custom header. Losing this check would make
      // consent forgeable against a signed-in user, which is audit finding H3.
      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response.json()).toMatchObject({
        error: 'invalid_request',
        error_description: expect.stringContaining('x-openops-consent'),
      });
    });

    it('gets past the header check with it present, failing on the request id instead', async () => {
      const token = await generateMockToken({ type: PrincipalType.USER });

      const response = await app!.inject({
        method: 'POST',
        url: '/v1/oauth/requests/any-request-id/decision',
        headers: {
          authorization: `Bearer ${token}`,
          'x-openops-consent': '1',
        },
        body: { approve: true },
      });

      // Proves the assertion above is about the header and not about the route rejecting
      // everything: the failure has moved on to the unusable request id.
      expect(response.json().error_description).not.toContain(
        'x-openops-consent',
      );
    });
  });

  describe('error envelope', () => {
    it('answers an unsupported grant with an RFC 6749 body and 400', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/v1/oauth/token',
        payload: 'grant_type=implicit',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });

      // Clients branch on `error` to decide whether to retry, re-authorize, or discard a
      // stored credential, so these routes must not use the application envelope.
      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response.json()).toMatchObject({
        error: 'unsupported_grant_type',
      });
      expect(response.json()).not.toHaveProperty('code');
    });

    it('keeps token failures out of caches', async () => {
      const response = await app!.inject({
        method: 'POST',
        url: '/v1/oauth/token',
        payload: 'grant_type=implicit',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });

      expect(response.headers['cache-control']).toContain('no-store');
    });
  });

  describe('authorize', () => {
    it('renders an error for an unregistered redirect_uri instead of redirecting', async () => {
      const clientId = await registerClient();

      const response = await app!.inject({
        method: 'GET',
        url: authorizeUrl({
          client_id: clientId,
          redirect_uri: 'https://attacker.example/steal',
          response_type: 'code',
          code_challenge: CODE_CHALLENGE,
          code_challenge_method: 'S256',
          resource: 'http://localhost:3020/mcp',
        }),
      });

      // Redirecting here would hand an attacker an open redirect on an endpoint whose
      // whole job is to send browsers somewhere — audit finding H4.
      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response.headers.location).toBeUndefined();
    });

    it('renders an error for an unknown client instead of redirecting', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: authorizeUrl({
          client_id: 'not-a-registered-client',
          redirect_uri: REGISTERED_REDIRECT,
          response_type: 'code',
          code_challenge: CODE_CHALLENGE,
          code_challenge_method: 'S256',
          resource: 'http://localhost:3020/mcp',
        }),
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response.headers.location).toBeUndefined();
    });

    it('redirects a validated request to the consent screen', async () => {
      const clientId = await registerClient();

      const response = await app!.inject({
        method: 'GET',
        url: authorizeUrl({
          client_id: clientId,
          redirect_uri: REGISTERED_REDIRECT,
          response_type: 'code',
          code_challenge: CODE_CHALLENGE,
          code_challenge_method: 'S256',
          resource: 'http://localhost:3020/mcp',
        }),
      });

      // The counterpart to the two above: a good request does redirect, and to the
      // consent surface rather than back to the client.
      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(response.headers.location).toContain('/settings/connected-apps');
      expect(response.headers.location).toContain('request_id=');
    });

    it('sends a validated client back to its own redirect_uri when PKCE is missing', async () => {
      const clientId = await registerClient();

      const response = await app!.inject({
        method: 'GET',
        url: authorizeUrl({
          client_id: clientId,
          redirect_uri: REGISTERED_REDIRECT,
          response_type: 'code',
          resource: 'http://localhost:3020/mcp',
          state: 'state-value',
        }),
      });

      // Once the client and its redirect_uri are known good, errors go back to the
      // client — carrying `state` and `iss` — rather than being rendered.
      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(response.headers.location).toContain(REGISTERED_REDIRECT);
      expect(response.headers.location).toContain('error=invalid_request');
      expect(response.headers.location).toContain('state=state-value');
      expect(response.headers.location).toContain('iss=');
    });
  });

  describe('discovery', () => {
    it('serves authorization server metadata unauthenticated', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/.well-known/oauth-authorization-server',
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.json()).toMatchObject({
        issuer: 'http://localhost:3000',
        code_challenge_methods_supported: ['S256'],
      });
    });

    it('advertises only endpoints it actually serves', async () => {
      const metadata = (
        await app!.inject({
          method: 'GET',
          url: '/.well-known/oauth-authorization-server',
        })
      ).json();

      // Each with the method a client would really use: a 404 here means the document
      // promises something the server does not answer, which fails in a way that is very
      // hard to diagnose from outside. This is audit finding L4.
      const probes: [string, 'GET' | 'POST'][] = [
        [metadata.authorization_endpoint, 'GET'],
        [metadata.token_endpoint, 'POST'],
        [metadata.registration_endpoint, 'POST'],
        [metadata.revocation_endpoint, 'POST'],
        [metadata.jwks_uri, 'GET'],
      ];

      for (const [endpoint, method] of probes) {
        const probe = await app!.inject({
          method,
          url: new URL(endpoint).pathname,
        });

        expect({ endpoint, status: probe.statusCode }).not.toMatchObject({
          status: StatusCodes.NOT_FOUND,
        });
      }
    });

    it('serves a JWKS with a usable signing key at the advertised location', async () => {
      const metadata = (
        await app!.inject({
          method: 'GET',
          url: '/.well-known/oauth-authorization-server',
        })
      ).json();

      const response = await app!.inject({
        method: 'GET',
        url: new URL(metadata.jwks_uri).pathname,
      });

      // A real key, reachable where the metadata says it is — the spike advertised a
      // `jwks_uri` that served nothing, which is audit finding M4.
      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.json().keys[0]).toMatchObject({
        kty: 'RSA',
        alg: 'RS256',
        kid: expect.any(String),
      });
    });
  });
});
