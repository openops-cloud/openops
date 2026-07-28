import { oauthConfig } from './oauth-config';

export type ResourceId = 'api' | 'mcp';

export type RegisteredResource = {
  id: ResourceId;
  audience: string;
  canonicalUri: string;
  scopes: string[];
};

/**
 * RFC 8707 resource indicators the authorization server will issue tokens for.
 *
 * A token for the `api` resource is used against the OpenOps API directly. A token
 * for `mcp` is only ever accepted by the resource server, which exchanges it for
 * an API-audience token — enforced by the audience check in `token-exchange.ts`,
 * not by anything recorded here.
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

  const normalized = resource.replace(/\/+$/, '');
  return getRegisteredResources().find((r) => r.canonicalUri === normalized);
}

export function getSupportedScopes(): string[] {
  return getRegisteredResources().flatMap((r) => r.scopes);
}
