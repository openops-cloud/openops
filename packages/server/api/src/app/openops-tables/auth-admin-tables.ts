import { authenticateUserInOpenOpsTables } from '@openops/common';
import { AppSystemProp, cacheWrapper, system } from '@openops/server-shared';
import { IAxiosRetryConfig } from 'axios-retry';
import { userService } from '../user/user-service';

export type AuthTokens = {
  token: string;
  refresh_token: string;
};

export async function authenticateAdminUserInOpenOpsTables(
  axiosRetryConfig?: IAxiosRetryConfig,
): Promise<AuthTokens> {
  const cacheKey = 'openops-tables-token';
  const tokenLifetimeMinutes = system.getNumber(
    AppSystemProp.TABLES_TOKEN_LIFETIME_MINUTES,
  );
  const tokenLifetimeSeconds = tokenLifetimeMinutes
    ? (tokenLifetimeMinutes - 10) * 60
    : undefined;

  let tokens = await cacheWrapper.getSerializedObject<AuthTokens>(cacheKey);

  if (!tokens) {
    const email = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL);
    const user = await userService.getUserByEmailOrThrow(email);

    tokens = await authenticateUserInOpenOpsTables(
      email,
      user.password,
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
