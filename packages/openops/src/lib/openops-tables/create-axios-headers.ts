import { AxiosHeaders } from 'axios';
import { TokenOrResolver } from './context-helpers';

export enum AuthType {
  JWT = 'JWT',
  Token = 'Token',
}

function getToken(tokenOrResolver: TokenOrResolver): string {
  return typeof tokenOrResolver === 'string'
    ? tokenOrResolver
    : tokenOrResolver.getToken();
}

function getAuthPrefix(useJwtOverride: boolean): AuthType {
  return useJwtOverride ? AuthType.JWT : AuthType.Token;
}

export const createAxiosHeaders = (
  tokenOrResolver: TokenOrResolver,
): AxiosHeaders => {
  const useJwtOverride = typeof tokenOrResolver === 'string';
  const token = getToken(tokenOrResolver);

  const prefix = getAuthPrefix(useJwtOverride);

  return new AxiosHeaders({
    'Content-Type': 'application/json',
    Authorization: `${prefix} ${token}`,
  });
};
