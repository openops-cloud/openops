/* eslint-disable @typescript-eslint/no-explicit-any */

import { jest } from '@jest/globals';

jest.mock('@openops/shared', () => {
  const actual = jest.requireActual('@openops/shared') as any;
  return {
    ...actual,
    openOpsId: jest.fn(),
    RefreshTokenClient: {
      SLACK_BOT: 'SLACK_BOT',
    },
    RefreshTokenClientPrincipals: {
      SLACK_BOT: {
        id: 'slack-bot',
        type: 'AI_CLIENT',
      },
    },
  };
});

const saveMock = jest.fn<any>();
const generateTokenGeneratorTokenMock = jest.fn<any>();
const getOrganizationIdMock = jest.fn<any>();

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  ...(jest.requireActual('../../../src/app/core/db/repo-factory') as any),
  repoFactory: () => () => ({
    save: saveMock,
  }),
}));

jest.mock('../../../src/app/project/project-service', () => ({
  projectService: {
    getOrganizationId: getOrganizationIdMock,
  },
}));

jest.mock(
  '../../../src/app/authentication/context/access-token-manager',
  () => ({
    accessTokenManager: {
      generateTokenGeneratorToken: generateTokenGeneratorTokenMock,
    },
  }),
);

jest.mock('@openops/server-shared', () => ({
  ...(jest.requireActual('@openops/server-shared') as any),
  cryptoUtils: {
    hashSHA256: jest.fn(),
  },
}));

import { cryptoUtils } from '@openops/server-shared';
import {
  ApplicationError,
  ErrorCode,
  openOpsId,
  Principal,
  PrincipalType,
  RefreshTokenClient,
} from '@openops/shared';
import { refreshTokenService } from '../../../src/app/refresh-token/refresh-token.service';

const mockOpenOpsId = openOpsId as jest.MockedFunction<typeof openOpsId>;

describe('RefreshTokenService', () => {
  describe('save', () => {
    it('should save the refresh token with AI_CLIENT principal', async () => {
      const principal: Principal = {
        id: 'user-id',
        projectId: 'project-id',
        organization: {
          id: 'org-id',
        },
        type: PrincipalType.USER,
      };
      const client = RefreshTokenClient.SLACK_BOT;
      const userToken = 'user-token';
      const generatedToken = 'generated-token';
      const hashedToken = 'hashed-token';
      const newId = 'new-id';
      const expirationTime = '2025-12-29T12:00:00.000Z';

      mockOpenOpsId.mockReturnValue(newId);
      generateTokenGeneratorTokenMock.mockResolvedValue({
        token: generatedToken,
        expirationTime,
      });
      (cryptoUtils.hashSHA256 as jest.Mock).mockReturnValue(hashedToken);
      getOrganizationIdMock.mockResolvedValue(principal.organization.id);

      const aiClient = {
        id: 'slack-bot',
        type: PrincipalType.AI_CLIENT,
        projectId: principal.projectId,
        organization: {
          id: principal.organization.id,
        },
      };

      saveMock.mockResolvedValue({
        id: newId,
        userId: principal.id,
        projectId: principal.projectId,
        client,
        refreshToken: generatedToken,
        principal,
        isRevoked: false,
        expirationTime,
      });

      const result = await refreshTokenService.save({
        userId: principal.id,
        projectId: principal.projectId,
        organizationId: principal.organization.id,
        client,
        userToken,
      });

      expect(generateTokenGeneratorTokenMock).toHaveBeenCalledWith(userToken);
      expect(cryptoUtils.hashSHA256).toHaveBeenCalledWith(generatedToken);
      expect(saveMock).toHaveBeenCalledWith({
        id: newId,
        userId: principal.id,
        projectId: principal.projectId,
        client,
        refreshToken: hashedToken,
        principal: aiClient,
        isRevoked: false,
        expirationTime,
      });
      expect(result).toEqual({
        token: generatedToken,
        expirationTime,
      });
    });

    it('should throw an error if the client is not supported', async () => {
      const principal: Principal = {
        id: 'user-id',
        projectId: 'project-id',
        organization: {
          id: 'org-id',
        },
        type: PrincipalType.USER,
      };
      const client = 'INVALID_CLIENT';
      const userToken = 'user-token';

      await expect(
        refreshTokenService.save({
          userId: principal.id,
          projectId: principal.projectId,
          organizationId: principal.organization.id,
          client: client as any,
          userToken,
        }),
      ).rejects.toThrow(
        new ApplicationError({
          code: ErrorCode.VALIDATION,
          params: {
            message: `Principal not found for client: ${client}`,
          },
        }),
      );
    });
  });
});
