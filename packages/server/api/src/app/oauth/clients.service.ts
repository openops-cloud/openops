import { AppSystemProp, logger } from '@openops/server-shared';
import { ApplicationError, ErrorCode, openOpsId } from '@openops/shared';
import { repoFactory } from '../core/db/repo-factory';
import { oauthConfig } from './oauth-config';
import { sha256Hex, timingSafeStringEqual } from './oauth-crypto';
import {
  invalidClient,
  invalidClientMetadata,
  invalidRedirectUri,
  unauthorizedClient,
} from './oauth-errors';
import { OAuthClient, OAuthTokenEndpointAuthMethod } from './oauth-model';
import { OAuthClientEntity } from './oauth.entity';
import { isRegistrableRedirectUri } from './redirect-uri';

const repo = repoFactory<OAuthClient>(OAuthClientEntity);

/**
 * Row id for the hosted MCP resource server. Doubles as the `client_id` it sends
 * on the token endpoint, so it must fit the 21-character id column.
 */
export const RS_CLIENT_ID = 'openops-mcp-rs';
export const TOKEN_EXCHANGE_GRANT =
  'urn:ietf:params:oauth:grant-type:token-exchange';

const RS_CLIENT_NAME = 'OpenOps MCP Resource Server';
const RS_CLIENT_SCOPE = 'mcp';
const RS_CLIENT_SECRET_MIN_LENGTH = 32;
const UNIQUE_VIOLATION = '23505';

/** No SHA-256 hex digest equals this, so comparing against it always fails. */
const UNMATCHABLE_HASH = '-'.repeat(64);

/**
 * Grants a dynamically registered client may ask for. Deliberately excludes
 * `implicit`, `password`, `client_credentials` and the token-exchange grant:
 * anyone on the network can register, so registration must never be a path to a
 * grant that skips user consent.
 */
const REGISTRABLE_GRANT_TYPES = ['authorization_code', 'refresh_token'];

const MAX_CLIENT_NAME_LENGTH = 128;
const MAX_SCOPE_LENGTH = 128;
const MAX_REDIRECT_URIS = 10;

export type RegisteredClientResponse = {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  token_endpoint_auth_method: OAuthTokenEndpointAuthMethod;
  scope: string;
  client_id_issued_at: number;
};

type ClientRegistrationMetadata = {
  clientName: string;
  redirectUris: string[];
  grantTypes: string[];
  scope: string;
};

function parseClientName(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw invalidClientMetadata('client_name is required');
  }

  if (value.length > MAX_CLIENT_NAME_LENGTH) {
    throw invalidClientMetadata(
      `client_name must be at most ${MAX_CLIENT_NAME_LENGTH} characters`,
    );
  }

  return value;
}

function parseRedirectUris(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidRedirectUri('redirect_uris must contain at least one entry');
  }

  if (value.length > MAX_REDIRECT_URIS) {
    throw invalidRedirectUri(
      `redirect_uris must contain at most ${MAX_REDIRECT_URIS} entries`,
    );
  }

  for (const uri of value) {
    if (typeof uri !== 'string' || !isRegistrableRedirectUri(uri)) {
      throw invalidRedirectUri(
        'redirect_uris must be https URIs or http loopback URIs without a fragment',
      );
    }
  }

  return value as string[];
}

function parseGrantTypes(value: unknown): string[] {
  if (value === undefined) {
    return [...REGISTRABLE_GRANT_TYPES];
  }

  if (!Array.isArray(value) || value.length === 0) {
    throw invalidClientMetadata('grant_types must be a non-empty array');
  }

  for (const grantType of value) {
    if (
      typeof grantType !== 'string' ||
      !REGISTRABLE_GRANT_TYPES.includes(grantType)
    ) {
      throw invalidClientMetadata(
        `grant_types may only contain ${REGISTRABLE_GRANT_TYPES.join(', ')}`,
      );
    }
  }

  return value as string[];
}

function parseScope(value: unknown): string {
  // Left empty on purpose: the authorize endpoint applies the requested
  // resource's default scope, which registration cannot know yet.
  if (value === undefined) {
    return '';
  }

  if (typeof value !== 'string') {
    throw invalidClientMetadata('scope must be a string');
  }

  if (value.length > MAX_SCOPE_LENGTH) {
    throw invalidClientMetadata(
      `scope must be at most ${MAX_SCOPE_LENGTH} characters`,
    );
  }

  return value;
}

function assertPublicAuthMethod(value: unknown): void {
  if (value !== undefined && value !== 'none') {
    throw invalidClientMetadata(
      'token_endpoint_auth_method must be "none"; registered clients must use PKCE',
    );
  }
}

function parseRegistrationMetadata(body: unknown): ClientRegistrationMetadata {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw invalidClientMetadata('client metadata must be a JSON object');
  }

  const metadata = body as Record<string, unknown>;
  assertPublicAuthMethod(metadata['token_endpoint_auth_method']);

  return {
    clientName: parseClientName(metadata['client_name']),
    redirectUris: parseRedirectUris(metadata['redirect_uris']),
    grantTypes: parseGrantTypes(metadata['grant_types']),
    scope: parseScope(metadata['scope']),
  };
}

/**
 * RFC 6749 §2.3.1 requires both halves of the Basic credential to be
 * form-urlencoded, but clients that skip the encoding are common; a malformed
 * escape must therefore fall back to the raw value rather than fail decoding.
 */
function formUrlDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseBasicCredentials(
  authorizationHeader: string | undefined,
): { clientId: string; clientSecret: string } | undefined {
  if (!authorizationHeader?.toLowerCase().startsWith('basic ')) {
    return undefined;
  }

  const decoded = Buffer.from(
    authorizationHeader.slice('basic '.length).trim(),
    'base64',
  ).toString('utf-8');

  // Only the first colon separates the halves; secrets may contain colons.
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex < 0) {
    return undefined;
  }

  return {
    clientId: formUrlDecode(decoded.slice(0, separatorIndex)),
    clientSecret: formUrlDecode(decoded.slice(separatorIndex + 1)),
  };
}

export const clientsService = {
  /** RFC 7591 Dynamic Client Registration, restricted to public PKCE clients. */
  async registerClient(body: unknown): Promise<RegisteredClientResponse> {
    const metadata = parseRegistrationMetadata(body);
    const now = new Date().toISOString();

    const client: OAuthClient = {
      id: openOpsId(),
      created: now,
      updated: now,
      clientName: metadata.clientName,
      redirectUris: metadata.redirectUris,
      grantTypes: metadata.grantTypes,
      tokenEndpointAuthMethod: 'none',
      clientSecretHash: null,
      scope: metadata.scope,
    };

    await repo().save(client);
    logger.info('OAuth client registered', {
      clientId: client.id,
      clientName: client.clientName,
    });

    return {
      client_id: client.id,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      scope: client.scope,
      client_id_issued_at: Math.floor(
        new Date(client.created).getTime() / 1000,
      ),
    };
  },

  async getClient(clientId: string): Promise<OAuthClient | null> {
    return repo().findOneBy({ id: clientId });
  },

  async getClientOrThrow(clientId: string): Promise<OAuthClient> {
    const client = await clientsService.getClient(clientId);

    if (!client) {
      throw invalidClient('unknown client');
    }

    return client;
  },

  /**
   * A client may only use the grants it registered, so a client that registered
   * `authorization_code` alone cannot later present a refresh token.
   */
  assertGrantTypeAllowed(client: OAuthClient, grantType: string): void {
    if (!client.grantTypes.includes(grantType)) {
      throw unauthorizedClient(
        `client is not authorized to use grant type ${grantType}`,
      );
    }
  },

  /**
   * HTTP Basic client authentication (RFC 6749 §2.3.1) for the confidential
   * resource server. Every failure returns the same description so the response
   * cannot be used to enumerate client ids.
   */
  async authenticateResourceServerClient(
    authorizationHeader: string | undefined,
  ): Promise<OAuthClient> {
    const credentials = parseBasicCredentials(authorizationHeader);

    if (!credentials) {
      throw invalidClient('missing client credentials');
    }

    const client = await clientsService.getClient(credentials.clientId);
    const failure = invalidClient('client authentication failed');

    const isConfidential =
      client !== null &&
      client.tokenEndpointAuthMethod === 'client_secret_basic' &&
      client.clientSecretHash !== null;

    // Always run the comparison, even for an unknown client, so response time
    // does not reveal whether the client id exists.
    const secretMatches = timingSafeStringEqual(
      sha256Hex(credentials.clientSecret),
      isConfidential ? (client.clientSecretHash as string) : UNMATCHABLE_HASH,
    );

    if (!isConfidential || !secretMatches) {
      logger.warn('OAuth client authentication failed', {
        clientId: credentials.clientId,
        reason: isConfidential
          ? 'secret mismatch'
          : 'not a confidential client',
      });
      throw failure;
    }

    return client;
  },

  /**
   * Provisions the hosted MCP resource server as a confidential client on boot.
   * Optional: self-hosted installs without a hosted resource server configure no
   * secret and get no such client.
   */
  async ensureResourceServerClient(): Promise<void> {
    const secret = oauthConfig.getResourceServerClientSecret();

    if (!secret) {
      return;
    }

    // Fail at boot rather than run with a brute-forceable shared secret. This is a
    // configuration fault, not an OAuth protocol response.
    if (secret.length < RS_CLIENT_SECRET_MIN_LENGTH) {
      throw new ApplicationError(
        {
          code: ErrorCode.SYSTEM_PROP_INVALID,
          params: { prop: AppSystemProp.OAUTH_RS_CLIENT_SECRET },
        },
        `OPS_${AppSystemProp.OAUTH_RS_CLIENT_SECRET} must be at least ${RS_CLIENT_SECRET_MIN_LENGTH} characters`,
      );
    }

    const secretHash = sha256Hex(secret);
    const existing = await repo().findOneBy({ id: RS_CLIENT_ID });
    const now = new Date().toISOString();

    if (existing) {
      if (existing.clientSecretHash !== secretHash) {
        await repo().update(
          { id: RS_CLIENT_ID },
          { clientSecretHash: secretHash, updated: now },
        );
        logger.info('OAuth resource server client secret rotated');
      }

      return;
    }

    try {
      await repo().insert({
        id: RS_CLIENT_ID,
        created: now,
        updated: now,
        clientName: RS_CLIENT_NAME,
        redirectUris: [],
        grantTypes: [TOKEN_EXCHANGE_GRANT],
        tokenEndpointAuthMethod: 'client_secret_basic',
        clientSecretHash: secretHash,
        scope: RS_CLIENT_SCOPE,
      });
      logger.info('OAuth resource server client created');
    } catch (error) {
      // A replica booting at the same time inserted it first; its row is
      // equivalent, so adopt it rather than failing startup.
      if ((error as { code?: string }).code !== UNIQUE_VIOLATION) {
        throw error;
      }
      logger.info(
        'OAuth resource server client already created by another instance',
      );
    }
  },
};
