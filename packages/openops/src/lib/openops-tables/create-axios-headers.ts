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

export const createAxiosHeaders = (
  tokenOrResolver: TokenOrResolver,
): AxiosHeaders => {
  const token = getToken(tokenOrResolver);

  const prefix =
    typeof tokenOrResolver === 'string' ? AuthType.JWT : AuthType.Token;

  return new AxiosHeaders({
    'Content-Type': 'application/json',
    Authorization: `${prefix} ${token}`,
  });
};
