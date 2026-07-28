import { AppSystemProp, system } from '@openops/server-shared';

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

export const oauthConfig = {
  isEnabled(): boolean {
    return system.getBoolean(AppSystemProp.OAUTH_ENABLED) ?? false;
  },
  getIssuerUrl(): string {
    return stripTrailingSlashes(
      system.getOrThrow<string>(AppSystemProp.OAUTH_ISSUER_URL),
    );
  },
  getApiAudience(): string {
    return oauthConfig.getIssuerUrl();
  },
  getMcpResourceUrl(): string | undefined {
    const value = system.get<string>(AppSystemProp.MCP_RESOURCE_URL);
    return value ? stripTrailingSlashes(value) : undefined;
  },
  getAccessTokenTtlSeconds(): number {
    return system.getNumberOrThrow(
      AppSystemProp.OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    );
  },
  getRefreshTokenTtlDays(): number {
    return system.getNumberOrThrow(AppSystemProp.OAUTH_REFRESH_TOKEN_TTL_DAYS);
  },
  getExchangeTokenTtlSeconds(): number {
    return system.getNumberOrThrow(
      AppSystemProp.OAUTH_EXCHANGE_TOKEN_TTL_SECONDS,
    );
  },
  getSigningKeyPemPath(): string | undefined {
    return system.get<string>(AppSystemProp.OAUTH_SIGNING_KEY_PEM_PATH);
  },
  getResourceServerClientSecret(): string | undefined {
    return system.get<string>(AppSystemProp.OAUTH_RS_CLIENT_SECRET);
  },
};
