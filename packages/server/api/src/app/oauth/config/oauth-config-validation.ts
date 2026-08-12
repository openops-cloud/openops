import { AppSystemProp, DatabaseType, system } from '@openops/server-shared';
import { ApplicationError, ErrorCode } from '@openops/shared';
import { stripTrailingSlashes } from '../common/canonical-url';
import { getRegisteredResources } from '../discovery/resource-registry';
import { oauthConfig } from './oauth-config';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

function invalidProp(prop: string, message: string): ApplicationError {
  return new ApplicationError(
    { code: ErrorCode.SYSTEM_PROP_INVALID, params: { prop } },
    `OPS_${prop} ${message}`,
  );
}

// Scheme and host are case-insensitive per RFC 3986, and a trailing slash names the same
// resource, so audiences are compared in this form.
function canonicalize(audience: string): string {
  try {
    const url = new URL(audience);
    return `${url.protocol.toLowerCase()}//${url.host.toLowerCase()}${stripTrailingSlashes(
      url.pathname,
    )}`;
  } catch {
    return audience;
  }
}

function assertWithinRange(
  prop: string,
  value: number,
  min: number,
  max: number,
  unit: string,
): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw invalidProp(
      prop,
      `must be a whole number of ${unit} between ${min} and ${max}, got ${value}`,
    );
  }
}

function parseAbsoluteUrl(prop: string, value: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw invalidProp(prop, 'must be an absolute URL');
  }

  if (url.protocol !== 'https:' && !LOOPBACK_HOSTNAMES.has(url.hostname)) {
    throw invalidProp(prop, 'must use https unless it points at loopback');
  }

  if (url.search !== '' || url.hash !== '') {
    throw invalidProp(prop, 'must not contain a query string or fragment');
  }

  return url;
}

/**
 * Run before any OAuth route is served. A value that is merely wrong, rather than
 * malformed, otherwise produces a server that looks healthy while a guarantee is gone.
 */
export function validateOAuthConfiguration(): void {
  // The migration is registered for Postgres only, so on any other driver the tables are
  // missing and the first request would fail instead of the boot.
  if (system.get(AppSystemProp.DB_TYPE) === DatabaseType.SQLITE3) {
    throw invalidProp(
      AppSystemProp.OAUTH_ENABLED,
      'requires a PostgreSQL database',
    );
  }

  parseAbsoluteUrl(AppSystemProp.OAUTH_ISSUER_URL, oauthConfig.getIssuerUrl());

  // Self-contained, so this TTL is the worst case for how long a revoked connection
  // keeps working.
  assertWithinRange(
    AppSystemProp.OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    oauthConfig.getAccessTokenTtlSeconds(),
    60,
    60 * 60,
    'seconds',
  );

  // Only has to outlive one API call made on an agent's behalf.
  assertWithinRange(
    AppSystemProp.OAUTH_EXCHANGE_TOKEN_TTL_SECONDS,
    oauthConfig.getExchangeTokenTtlSeconds(),
    60,
    15 * 60,
    'seconds',
  );

  // Also sets how long a revoked row must be retained for reuse detection.
  assertWithinRange(
    AppSystemProp.OAUTH_REFRESH_TOKEN_TTL_DAYS,
    oauthConfig.getRefreshTokenTtlDays(),
    1,
    90,
    'days',
  );

  const mcpResourceUrl = oauthConfig.getMcpResourceUrl();
  if (mcpResourceUrl !== undefined) {
    parseAbsoluteUrl(AppSystemProp.MCP_RESOURCE_URL, mcpResourceUrl);
  }

  // Distinct audiences are what separate a token the resource server may hold from one
  // the API will accept; equal ones would silently void the no-token-passthrough rule.
  const audiences = getRegisteredResources().map((resource) =>
    canonicalize(resource.audience),
  );

  if (new Set(audiences).size !== audiences.length) {
    throw invalidProp(
      AppSystemProp.MCP_RESOURCE_URL,
      'must differ from OPS_OAUTH_ISSUER_URL: each resource needs its own audience',
    );
  }
}
