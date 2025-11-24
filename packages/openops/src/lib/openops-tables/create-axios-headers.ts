import { AxiosHeaders } from 'axios';
import { shouldUseDatabaseToken, TokenOrContext } from './context-helpers';

export enum AuthType {
  JWT = 'JWT',
  Token = 'Token',
}

function getToken(contextOrToken: TokenOrContext | string): string {
  return typeof contextOrToken === 'string'
    ? contextOrToken
    : contextOrToken.getToken();
}

function getAuthPrefix(
  useJwtOverride: boolean,
  shouldUseDatabaseTokenConfig: boolean,
): AuthType {
  const useJwt = useJwtOverride || !shouldUseDatabaseTokenConfig;
  return useJwt ? AuthType.JWT : AuthType.Token;
}

export const createAxiosHeaders = (
  contextOrToken: TokenOrContext,
): AxiosHeaders => {
  const useJwtOverride = typeof contextOrToken === 'string';
  const token = getToken(contextOrToken);

  const prefix = getAuthPrefix(useJwtOverride, shouldUseDatabaseToken());

  return new AxiosHeaders({
    'Content-Type': 'application/json',
    Authorization: `${prefix} ${token}`,
  });
};
