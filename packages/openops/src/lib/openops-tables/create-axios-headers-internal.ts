import { AppSystemProp, system } from '@openops/server-shared';
import { AxiosHeaders } from 'axios';

export enum AuthType {
  JWT = 'JWT',
  Token = 'Token',
}

export default function createAxiosHeadersInternal(
  token: string,
  useJwtOverride: boolean,
): AxiosHeaders {
  const shouldUseDatabaseTokenConfig =
    system.getBoolean(AppSystemProp.USE_DATABASE_TOKEN) ?? false;

  const useJwt = useJwtOverride || !shouldUseDatabaseTokenConfig;

  const prefix = useJwt ? AuthType.JWT : AuthType.Token;

  return new AxiosHeaders({
    'Content-Type': 'application/json',
    Authorization: `${prefix} ${token}`,
  });
}
