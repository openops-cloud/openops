import { AppSystemProp, cacheWrapper, system } from '@openops/server-shared';
import { AxiosHeaders } from 'axios';
import { IAxiosRetryConfig } from 'axios-retry';
import { makeOpenOpsTablesPost } from './requests-helpers';
const tokenLifetimeMinutes = system.getNumber(
  AppSystemProp.TABLES_TOKEN_LIFETIME_MINUTES,
);

const tokenLifetimeSeconds = tokenLifetimeMinutes
  ? tokenLifetimeMinutes * 60 - 60 // Subtract 60 seconds to ensure the cache expired before the token
  : undefined;

export interface AuthTokens {
  token: string;
  refresh_token: string;
}

export async function authenticateUserInOpenOpsTables(
  email: string,
  password: string,
  axiosRetryConfig?: IAxiosRetryConfig,
): Promise<AuthTokens> {
  const requestBody = {
    email,
    password,
  };

  const headers = new AxiosHeaders({
    'Content-Type': 'application/json',
  });

  return makeOpenOpsTablesPost<AuthTokens>(
    'api/user/token-auth/',
    requestBody,
    headers,
    axiosRetryConfig,
  );
}

export async function authenticateDefaultUserInOpenOpsTables(
  axiosRetryConfig?: IAxiosRetryConfig,
): Promise<AuthTokens> {
  const cacheKey = 'openops-tables-token';

  let tokens = await cacheWrapper.getSerializedObject<AuthTokens>(cacheKey);

  if (!tokens) {
    const email = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL);
    const password = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_PASSWORD);

    tokens = await authenticateUserInOpenOpsTables(
      email,
      password,
      axiosRetryConfig,
    );
    await cacheWrapper.setSerializedObject(
      cacheKey,
      tokens,
      tokenLifetimeSeconds,
    );
  }

  return tokens;
}
