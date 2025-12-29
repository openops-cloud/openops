import { openOpsId, Principal, RefreshToken } from '@openops/shared';
import { accessTokenManager } from '../authentication/context/access-token-manager';
import { repoFactory } from '../core/db/repo-factory';
import { jwtUtils } from '../helper/jwt-utils';
import { RefreshTokenEntity } from './refresh-token.entity';

export const refreshTokenRepo = repoFactory(RefreshTokenEntity);

export const refreshTokenService = {
  async save({
    principal,
    client,
    userToken,
  }: SaveParams): Promise<RefreshToken> {
    const refreshToken = await accessTokenManager.generateTokenGeneratorToken(
      userToken,
    );

    const decoded = jwtUtils.decode<{ exp: number }>({ jwt: refreshToken });
    const expirationTime = new Date(decoded.payload.exp * 1000).toISOString();

    return refreshTokenRepo().save({
      id: openOpsId(),
      userId: principal.id,
      projectId: principal.projectId,
      client,
      refresh_token: refreshToken,
      principal,
      is_revoked: false,
      expirationTime,
    });
  },
};

type SaveParams = {
  principal: Principal;
  client: string;
  userToken: string;
};
