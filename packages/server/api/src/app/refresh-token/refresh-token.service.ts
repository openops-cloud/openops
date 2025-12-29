import { cryptoUtils } from '@openops/server-shared';
import {
  ApplicationError,
  ErrorCode,
  GeneratedRefreshToken,
  openOpsId,
  RefreshTokenClient,
  RefreshTokenClientPrincipals,
} from '@openops/shared';
import { accessTokenManager } from '../authentication/context/access-token-manager';
import { repoFactory } from '../core/db/repo-factory';
import { RefreshTokenEntity } from './refresh-token.entity';

export const refreshTokenRepo = repoFactory(RefreshTokenEntity);

export const refreshTokenService = {
  async save({
    userId,
    projectId,
    organizationId,
    client,
    userToken,
  }: SaveParams): Promise<GeneratedRefreshToken> {
    const principalTemplate = RefreshTokenClientPrincipals[client];

    if (!principalTemplate) {
      throw new ApplicationError({
        code: ErrorCode.VALIDATION,
        params: {
          message: `Principal not found for client: ${client}`,
        },
      });
    }

    const { token, expirationTime } =
      await accessTokenManager.generateTokenGeneratorToken(userToken);

    const hashedToken = cryptoUtils.hashSHA256(token);

    await refreshTokenRepo().save({
      id: openOpsId(),
      userId,
      projectId,
      client,
      refreshToken: hashedToken,
      principal: {
        ...principalTemplate,
        projectId,
        organization: {
          id: organizationId,
        },
      },
      isRevoked: false,
      expirationTime,
    });

    return {
      token,
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
