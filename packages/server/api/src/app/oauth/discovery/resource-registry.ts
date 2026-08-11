import { stripTrailingSlashes } from '../common/canonical-url';
import { oauthConfig } from '../config/oauth-config';

export type ResourceId = 'api' | 'mcp';

export type RegisteredResource = {
  id: ResourceId;
  audience: string;
  canonicalUri: string;
  scopes: string[];
};

/**
 * RFC 8707 resource indicators tokens may be issued for. An `mcp` token is only usable
 * against the resource server, which exchanges it for an `api` one; that separation is
 * enforced by the audience check in `token-exchange.ts`, not here.
 */
export function getRegisteredResources(): RegisteredResource[] {
  const apiAudience = oauthConfig.getApiAudience();

  const resources: RegisteredResource[] = [
    {
      id: 'api',
      audience: apiAudience,
      canonicalUri: apiAudience,
      scopes: ['api'],
    },
  ];

  const mcpResourceUrl = oauthConfig.getMcpResourceUrl();
  if (mcpResourceUrl) {
    resources.push({
      id: 'mcp',
      audience: mcpResourceUrl,
      canonicalUri: mcpResourceUrl,
      scopes: ['mcp'],
    });
  }

  return resources;
}

export function resolveResource(
  resource: string,
): RegisteredResource | undefined {
  if (!resource) {
    return undefined;
  }

  const normalized = stripTrailingSlashes(resource);
  return getRegisteredResources().find((r) => r.canonicalUri === normalized);
}

export function getSupportedScopes(): string[] {
  return getRegisteredResources().flatMap((r) => r.scopes);
}
