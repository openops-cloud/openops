import { RateLimitOptions } from '@fastify/rate-limit';
import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { logger, SharedSystemProp, system } from '@openops/server-shared';
import { PrincipalType, PUBLIC_ROUTE_POLICY } from '@openops/shared';
import { FastifyReply } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { getUnscopedRoutePolicy } from '../core/security/route-policies/route-security-policy-factory';
import {
  AuthorizeQuery,
  OAuthRequestBody,
  optionalParam,
  readParam,
  requireParam,
  validateAuthorizeRequest,
} from './authorization/authorize-validation';
import { pendingAuthorizationService } from './authorization/pending-authorization.service';
import {
  clientsService,
  TOKEN_EXCHANGE_GRANT,
} from './clients/clients.service';
import { grantsService } from './clients/grants.service';
import { stripTrailingSlashes } from './common/canonical-url';
import { invalidRequest, unsupportedGrantType } from './common/oauth-errors';
import { oauthConfig } from './config/oauth-config';
import { resolveResource } from './discovery/resource-registry';
import { listAvailableProjects } from './projects/available-projects';
import { OAuthClient } from './storage/oauth-model';
import { exchangeToken } from './tokens/token-exchange';
import { tokensService } from './tokens/tokens.service';

const REGISTRATION_RATE_LIMIT: RateLimitOptions = {
  max: 10,
  timeWindow: '1 minute',
};

// Refresh is a routine background operation for connected agents, so this sits well above
// normal use while still bounding brute-force attempts.
const TOKEN_RATE_LIMIT: RateLimitOptions = {
  max: 120,
  timeWindow: '1 minute',
};

// A cross-site form post cannot set a custom header, so requiring this on the decision
// keeps a third party from driving it on a logged-in user's behalf.
const CONSENT_HEADER = 'x-openops-consent';

function buildRedirectUrl(
  redirectUri: string,
  params: Record<string, string | undefined>,
): string {
  const url = new URL(redirectUri);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  // RFC 9207: naming the issuer lets clients detect a mix-up between servers.
  url.searchParams.set('iss', oauthConfig.getIssuerUrl());

  return url.toString();
}

function renderAuthorizeError(
  reply: FastifyReply,
  error: string,
  description: string,
): FastifyReply {
  return noStore(reply)
    .status(StatusCodes.BAD_REQUEST)
    .type('text/html')
    .send(
      `<!doctype html><html><head><title>Authorization error</title></head>` +
        `<body><h1>Authorization error</h1><p>${escapeHtml(description)}</p>` +
        `<p><code>${escapeHtml(error)}</code></p></body></html>`,
    );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function noStore(reply: FastifyReply): FastifyReply {
  return reply.header('Cache-Control', 'no-store').header('Pragma', 'no-cache');
}

function getConsentUrl(requestId: string): string {
  const frontendUrl = stripTrailingSlashes(
    system.getOrThrow<string>(SharedSystemProp.FRONTEND_URL),
  );

  return `${frontendUrl}/settings/connected-apps?request_id=${encodeURIComponent(
    requestId,
  )}`;
}

export const oauthController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/register',
    {
      config: {
        security: PUBLIC_ROUTE_POLICY,
        rateLimit: REGISTRATION_RATE_LIMIT,
      },
      schema: {
        description:
          'Register an OAuth client dynamically (RFC 7591). Registered clients are public clients and must use PKCE.',
      },
    },
    async (request, reply) => {
      const registered = await clientsService.registerClient(request.body);

      return noStore(reply).status(StatusCodes.CREATED).send(registered);
    },
  );

  app.get(
    '/authorize',
    {
      config: {
        security: PUBLIC_ROUTE_POLICY,
        rateLimit: TOKEN_RATE_LIMIT,
      },
      schema: {
        description:
          'Start an authorization code flow. Validates the request and hands the browser an opaque request id for the consent screen.',
      },
    },
    async (request, reply) => {
      const query = request.query as AuthorizeQuery;
      const clientId = readParam(query, 'client_id');
      const client = clientId ? await clientsService.getClient(clientId) : null;

      const validation = validateAuthorizeRequest(query, client);

      if (validation.kind === 'render_error') {
        return renderAuthorizeError(
          reply,
          validation.error,
          validation.description,
        );
      }

      if (validation.kind === 'redirect_error') {
        // Reached only once the client and its redirect_uri are known good, so this
        // cannot be pointed at an unregistered destination.
        return reply.redirect(
          buildRedirectUrl(validation.redirectUri, {
            error: validation.error,
            error_description: validation.description,
            state: validation.state ?? undefined,
          }),
        );
      }

      const requestId = await pendingAuthorizationService.create({
        clientId: (client as OAuthClient).id,
        redirectUri: validation.redirectUri,
        codeChallenge: validation.codeChallenge,
        resource: validation.resource.canonicalUri,
        scope: validation.scope,
        state: validation.state,
      });

      return reply.redirect(getConsentUrl(requestId));
    },
  );

  app.get(
    '/requests/:requestId',
    {
      config: {
        security: getUnscopedRoutePolicy([PrincipalType.USER]),
      },
      schema: {
        description:
          'Details of a pending authorization request, for rendering the consent screen.',
        params: Type.Object({ requestId: Type.String() }),
      },
    },
    async (request) => {
      const { requestId } = request.params as { requestId: string };
      const pending = await pendingAuthorizationService.get(requestId);
      // Read from storage, never the request: the user bases their decision on this name,
      // so it must not be attacker-supplied.
      const client = await clientsService.getClientOrThrow(pending.clientId);
      const resource = resolveResource(pending.resource);

      // No project: a connection is not confined to one, so naming where it starts would
      // read as a limit that does not exist.
      return {
        requestId,
        clientName: client.clientName,
        scope: pending.scope,
        resourceId: resource?.id ?? null,
      };
    },
  );

  app.post(
    '/requests/:requestId/decision',
    {
      config: {
        security: getUnscopedRoutePolicy([PrincipalType.USER]),
      },
      schema: {
        description:
          'Approve or deny a pending authorization request and return the URL to send the browser to.',
        params: Type.Object({ requestId: Type.String() }),
        body: Type.Object({ approve: Type.Boolean() }),
      },
    },
    async (request, reply) => {
      if (request.headers[CONSENT_HEADER] === undefined) {
        throw invalidRequest(`the ${CONSENT_HEADER} header is required`);
      }

      const { requestId } = request.params as { requestId: string };
      const { approve } = request.body as { approve: boolean };

      const pending = await pendingAuthorizationService.consume(requestId);

      if (!approve) {
        return noStore(reply).send({
          redirectTo: buildRedirectUrl(pending.redirectUri, {
            error: 'access_denied',
            error_description: 'The user denied the request.',
            state: pending.state ?? undefined,
          }),
        });
      }

      const code = await tokensService.issueAuthorizationCode(
        pending,
        request.principal.id,
      );

      logger.info('OAuth authorization approved', {
        clientId: pending.clientId,
        userId: request.principal.id,
        resource: pending.resource,
      });

      return noStore(reply).send({
        redirectTo: buildRedirectUrl(pending.redirectUri, {
          code,
          state: pending.state ?? undefined,
        }),
      });
    },
  );

  app.post(
    '/token',
    {
      config: {
        security: PUBLIC_ROUTE_POLICY,
        rateLimit: TOKEN_RATE_LIMIT,
      },
      schema: {
        description:
          'Exchange an authorization code, refresh token, or subject token for an access token.',
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as OAuthRequestBody;

      switch (optionalParam(body, 'grant_type')) {
        case 'authorization_code':
          return noStore(reply).send(await handleAuthorizationCodeGrant(body));
        case 'refresh_token':
          return noStore(reply).send(await handleRefreshTokenGrant(body));
        case TOKEN_EXCHANGE_GRANT:
          return noStore(reply).send(
            await exchangeToken({
              authorizationHeader: request.headers.authorization,
              subjectToken: requireParam(body, 'subject_token'),
              subjectTokenType: optionalParam(body, 'subject_token_type'),
              requestedProjectId: optionalParam(body, 'project_id'),
            }),
          );
        default:
          throw unsupportedGrantType(
            `unsupported grant_type: ${
              optionalParam(body, 'grant_type') ?? 'missing'
            }`,
          );
      }
    },
  );

  app.post(
    '/revoke',
    {
      config: {
        security: PUBLIC_ROUTE_POLICY,
        rateLimit: TOKEN_RATE_LIMIT,
      },
      schema: {
        description:
          'Revoke a refresh token and the connection it belongs to (RFC 7009).',
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as OAuthRequestBody;
      const token = optionalParam(body, 'token');

      if (token) {
        await tokensService.revokeByRefreshToken(token);
      }

      // RFC 7009 §2.2: an unknown token is not an error.
      return noStore(reply).status(StatusCodes.OK).send({});
    },
  );

  app.get(
    '/projects',
    {
      config: {
        // SERVICE as well as USER: the one route a connection itself calls, to find out
        // where it may switch to. It returns no project data, only names.
        security: getUnscopedRoutePolicy([
          PrincipalType.USER,
          PrincipalType.SERVICE,
        ]),
      },
      schema: {
        description:
          'The projects the caller may act in, and which one they are acting in now.',
      },
    },
    async (request) => {
      const projects = await listAvailableProjects(request.principal.id);

      return {
        data: projects,
        currentProjectId: request.principal.projectId,
      };
    },
  );

  app.get(
    '/grants',
    {
      config: {
        security: getUnscopedRoutePolicy([PrincipalType.USER]),
      },
      schema: {
        description: 'List the connected applications for the current user.',
      },
    },
    async (request) => {
      const grants = await grantsService.listForUser(request.principal.id);
      const clients = await Promise.all(
        grants.map((grant) => clientsService.getClient(grant.clientId)),
      );

      return {
        data: grants.map((grant, index) => ({
          id: grant.id,
          clientName: clients[index]?.clientName ?? 'Unknown application',
          resourceId: grant.resourceId,
          created: grant.created,
          lastUsedAt: grant.lastUsedAt,
        })),
      };
    },
  );

  app.delete(
    '/grants/:grantId',
    {
      config: {
        security: getUnscopedRoutePolicy([PrincipalType.USER]),
      },
      schema: {
        description:
          'Revoke a connected application, invalidating its refresh tokens.',
        params: Type.Object({ grantId: Type.String() }),
      },
    },
    async (request, reply) => {
      const { grantId } = request.params as { grantId: string };

      await grantsService.revokeForUser(grantId, request.principal.id);

      return reply.status(StatusCodes.OK).send({});
    },
  );
};

async function handleAuthorizationCodeGrant(
  body: OAuthRequestBody,
): Promise<unknown> {
  const clientId = requireParam(body, 'client_id');
  const client = await clientsService.getClientOrThrow(clientId);
  clientsService.assertGrantTypeAllowed(client, 'authorization_code');

  return tokensService.redeemAuthorizationCode({
    code: requireParam(body, 'code'),
    clientId,
    redirectUri: requireParam(body, 'redirect_uri'),
    codeVerifier: requireParam(body, 'code_verifier'),
    resource: requireParam(body, 'resource'),
  });
}

async function handleRefreshTokenGrant(
  body: OAuthRequestBody,
): Promise<unknown> {
  const clientId = requireParam(body, 'client_id');
  const client = await clientsService.getClientOrThrow(clientId);
  clientsService.assertGrantTypeAllowed(client, 'refresh_token');

  return tokensService.rotateRefreshToken({
    refreshToken: requireParam(body, 'refresh_token'),
    clientId,
    requestedProjectId: optionalParam(body, 'project_id'),
  });
}
