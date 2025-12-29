import { cryptoUtils } from '@openops/server-shared';
import {
  ApplicationError,
  ErrorCode,
  openOpsId,
  RefreshToken,
  RefreshTokenClient,
  RefreshTokenClientPrincipals,
} from '@openops/shared';
import { accessTokenManager } from '../authentication/context/access-token-manager';
import { repoFactory } from '../core/db/repo-factory';
import { jwtUtils } from '../helper/jwt-utils';
import { RefreshTokenEntity } from './refresh-token.entity';

export const refreshTokenRepo = repoFactory(RefreshTokenEntity);

export const refreshTokenService = {
  async save({
    userId,
    projectId,
    organizationId,
    client,
    userToken,
  }: SaveParams): Promise<{ token: string; expirationTime: string }> {
    const principalTemplate = RefreshTokenClientPrincipals[client];

    if (!principalTemplate) {
      throw new ApplicationError({
        code: ErrorCode.VALIDATION,
        params: {
          message: `Principal not found for client: ${client}`,
        },
      });
    }

    const refreshToken = await accessTokenManager.generateTokenGeneratorToken(
      userToken,
    );

    const decoded = jwtUtils.decode<{ exp: number }>({ jwt: refreshToken });
    const expirationTime = new Date(decoded.payload.exp * 1000).toISOString();

    const hashedToken = cryptoUtils.hashSHA256(refreshToken);

    await refreshTokenRepo().save({
      id: openOpsId(),
      userId,
      projectId,
      client,
      refresh_token: hashedToken,
      principal: {
        ...principalTemplate,
        projectId,
        organization: {
          id: organizationId,
        },
      },
      is_revoked: false,
      expirationTime,
    });

    return {
      token: refreshToken,
      expirationTime,
    };
  },
};

type SaveParams = {
  userId: string;
  projectId: string;
  organizationId: string;
  client: RefreshTokenClient;
  userToken: string;
};
