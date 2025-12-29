/* eslint-disable @typescript-eslint/no-explicit-any */

import { jest } from '@jest/globals';
const saveMock = jest.fn<any>();
const generateTokenGeneratorTokenMock = jest.fn<any>();
const decodeMock = jest.fn<any>();

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  ...(jest.requireActual('../../../src/app/core/db/repo-factory') as any),
  repoFactory: () => () => ({
    save: saveMock,
  }),
}));

jest.mock(
  '../../../src/app/authentication/context/access-token-manager',
  () => ({
    accessTokenManager: {
      generateTokenGeneratorToken: generateTokenGeneratorTokenMock,
    },
  }),
);

jest.mock('../../../src/app/helper/jwt-utils', () => ({
  jwtUtils: {
    decode: decodeMock,
  },
}));

import { openOpsId, Principal, PrincipalType } from '@openops/shared';
import { refreshTokenService } from '../../../src/app/refresh-token/refresh-token.service';

jest.mock('@openops/shared', () => ({
  ...(jest.requireActual('@openops/shared') as any),
  openOpsId: jest.fn(),
}));

const mockOpenOpsId = openOpsId as jest.MockedFunction<typeof openOpsId>;

describe('RefreshTokenService', () => {
  describe('save', () => {
    it('should save the refresh token', async () => {
      const principal: Principal = {
        id: 'user-id',
        projectId: 'project-id',
        organization: {
          id: 'org-id',
        },
        type: PrincipalType.USER,
      };
      const client = 'slack';
      const userToken = 'user-token';
      const generatedToken = 'generated-token';
      const newId = 'new-id';
      const expirationTime = '2025-12-29T12:00:00.000Z';
      const exp = Math.floor(new Date(expirationTime).getTime() / 1000);

      mockOpenOpsId.mockReturnValue(newId);
      generateTokenGeneratorTokenMock.mockResolvedValue(generatedToken);
      decodeMock.mockReturnValue({ payload: { exp } });

      saveMock.mockResolvedValue({
        id: newId,
        userId: principal.id,
        projectId: principal.projectId,
        client,
        refresh_token: generatedToken,
        principal,
        is_revoked: false,
        expirationTime,
      });

      const result = await refreshTokenService.save({
        principal,
        client,
        userToken,
      });

      expect(generateTokenGeneratorTokenMock).toHaveBeenCalledWith(userToken);
      expect(decodeMock).toHaveBeenCalledWith({ jwt: generatedToken });
      expect(saveMock).toHaveBeenCalledWith({
        id: newId,
        userId: principal.id,
        projectId: principal.projectId,
        client,
        refresh_token: generatedToken,
        principal,
        is_revoked: false,
        expirationTime,
      });
      expect(result).toEqual({
        id: newId,
        userId: principal.id,
        projectId: principal.projectId,
        client,
        refresh_token: generatedToken,
        principal,
        is_revoked: false,
        expirationTime,
      });
    });
  });
});
