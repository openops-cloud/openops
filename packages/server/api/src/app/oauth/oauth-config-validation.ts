import { AppSystemProp, DatabaseType, system } from '@openops/server-shared';
import { ApplicationError, ErrorCode } from '@openops/shared';
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
    return `${url.protocol.toLowerCase()}//${url.host.toLowerCase()}${url.pathname.replace(
      /\/+$/,
      '',
    )}`;
  } catch {
    return audience;
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
