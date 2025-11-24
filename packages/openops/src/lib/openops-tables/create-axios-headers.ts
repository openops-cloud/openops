import { AxiosHeaders } from 'axios';
import { shouldUseDatabaseToken, TokenOrResolver } from './context-helpers';

export enum AuthType {
  JWT = 'JWT',
  Token = 'Token',
}

function getToken(tokenOrResolver: TokenOrResolver): string {
  return typeof tokenOrResolver === 'string'
    ? tokenOrResolver
    : tokenOrResolver.getToken();
}

function getAuthPrefix(
  useJwtOverride: boolean,
  shouldUseDatabaseTokenConfig: boolean,
): AuthType {
  const useJwt = useJwtOverride || !shouldUseDatabaseTokenConfig;
  return useJwt ? AuthType.JWT : AuthType.Token;
}

export const createAxiosHeaders = (
  tokenOrResolver: TokenOrResolver,
): AxiosHeaders => {
  const useJwtOverride = typeof tokenOrResolver === 'string';
  const token = getToken(tokenOrResolver);

  const prefix = getAuthPrefix(useJwtOverride, shouldUseDatabaseToken());

  return new AxiosHeaders({
    'Content-Type': 'application/json',
    Authorization: `${prefix} ${token}`,
  });
};
