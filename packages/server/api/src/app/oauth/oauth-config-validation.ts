import { AppSystemProp, DatabaseType, system } from '@openops/server-shared';
import { ApplicationError, ErrorCode } from '@openops/shared';
import { stripTrailingSlashes } from './canonical-url';
import { oauthConfig } from './oauth-config';
import { getRegisteredResources } from './resource-registry';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

function invalidProp(prop: string, message: string): ApplicationError {
  return new ApplicationError(
    { code: ErrorCode.SYSTEM_PROP_INVALID, params: { prop } },
    `OPS_${prop} ${message}`,
  );
}

/**
 * Scheme and host are case-insensitive per RFC 3986, and a trailing slash names
 * the same resource, so audiences are compared in this form.
 */
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

/**
 * Every TTL is already required to be a number, which catches a typo but not a value that
 * is merely wrong. These bounds exist because the wrong number produces a server that
 * looks healthy: tokens verify, tests pass, and a guarantee is quietly gone. An
 * access-token TTL of a month is the clearest case — revocation latency becomes a month,
 * since a self-contained token is only re-checked when it expires.
 */
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
 * Run before any OAuth route is served. Every check here exists because the
 * misconfiguration it catches would otherwise produce a server that looks healthy:
 * tokens verify, tests pass, and the guarantee is quietly gone.
 */
export function validateOAuthConfiguration(): void {
  // The migration is registered for Postgres only, so on any other driver the
  // tables are missing and the first request would fail instead of the boot.
  if (system.get(AppSystemProp.DB_TYPE) === DatabaseType.SQLITE3) {
    throw invalidProp(
      AppSystemProp.OAUTH_ENABLED,
      'requires a PostgreSQL database',
    );
  }

  parseAbsoluteUrl(AppSystemProp.OAUTH_ISSUER_URL, oauthConfig.getIssuerUrl());

  // An access token is self-contained, so its TTL is the worst case for how long a
  // revoked connection keeps working. An hour is already generous for that.
  assertWithinRange(
    AppSystemProp.OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    oauthConfig.getAccessTokenTtlSeconds(),
    60,
    60 * 60,
    'seconds',
  );

  // The exchanged token only has to outlive one API call made on an agent's behalf.
  assertWithinRange(
    AppSystemProp.OAUTH_EXCHANGE_TOKEN_TTL_SECONDS,
    oauthConfig.getExchangeTokenTtlSeconds(),
    60,
    15 * 60,
    'seconds',
  );

  // Refresh tokens rotate, so a long life is reasonable; unbounded is not, because it
  // also sets how long a revoked row must be retained for reuse detection.
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

  // Distinct audiences are what separate a token the resource server may hold
  // from one the API will accept. Were they equal, the resource server would
  // accept API-audience tokens and the no-token-passthrough rule — the whole
  // reason for a separate signing domain — would silently not hold.
  //
  // Compared in canonical form rather than as raw strings, so this holds no matter
  // how the values were normalised on the way in.
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
