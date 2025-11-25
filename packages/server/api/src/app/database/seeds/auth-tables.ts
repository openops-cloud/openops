import { authenticateUserInOpenOpsTables } from '@openops/common';
import { AppSystemProp, cacheWrapper, system } from '@openops/server-shared';
import { IAxiosRetryConfig } from 'axios-retry';
import { userService } from '../../user/user-service';

const tokenLifetimeMinutes = system.getNumber(
  AppSystemProp.TABLES_TOKEN_LIFETIME_MINUTES,
);

const tokenLifetimeSeconds = tokenLifetimeMinutes
  ? (tokenLifetimeMinutes - 10) * 60 // Subtract 10 minutes to ensure the cache expired before the token
  : undefined;

export type AuthTokens = {
  token: string;
  refresh_token: string;
};

export async function authenticateAdminUserInOpenOpsTables(
  axiosRetryConfig?: IAxiosRetryConfig,
): Promise<AuthTokens> {
  const cacheKey = 'openops-tables-token';

  let tokens = await cacheWrapper.getSerializedObject<AuthTokens>(cacheKey);

  if (!tokens) {
    const email = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL);
    const user = await userService.getUserByEmailOrFail({ email });

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
