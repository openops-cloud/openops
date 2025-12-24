/* eslint-disable @typescript-eslint/no-explicit-any */

import { jest } from '@jest/globals';
const saveMock = jest.fn();
const findOneByMock = jest.fn();

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  ...(jest.requireActual('../../../src/app/core/db/repo-factory') as any),
  repoFactory: () => () => ({
    save: saveMock,
    findOneBy: findOneByMock,
  }),
}));

import { encryptUtils } from '@openops/server-shared';
import {
  IntegrationName,
  openOpsId,
  Principal,
  PrincipalType,
} from '@openops/shared';
import { accessTokenManager } from '../../../src/app/authentication/context/access-token-manager';
import { integrationAuthorizationService } from '../../../src/app/integration-authorization/integration-authorization.service';

jest.mock('@openops/server-shared', () => ({
  ...(jest.requireActual('@openops/server-shared') as any),
  encryptUtils: {
    encryptString: jest.fn(),
  },
}));

jest.mock('@openops/shared', () => ({
  ...(jest.requireActual('@openops/shared') as any),
  openOpsId: jest.fn(),
}));

jest.mock(
  '../../../src/app/authentication/context/access-token-manager',
  () => ({
    accessTokenManager: {
      generateTokenGeneratorToken: jest.fn(),
    },
  }),
);

const mockAccessTokenManager = accessTokenManager as jest.Mocked<
  typeof accessTokenManager
>;
const mockEncryptUtils = encryptUtils as jest.Mocked<typeof encryptUtils>;
const mockOpenOpsId = openOpsId as jest.MockedFunction<typeof openOpsId>;

describe('IntegrationAuthorizationService', () => {
  describe('connect', () => {
    it('should generate a token and save the integration authorization', async () => {
      const principal: Principal = {
        id: 'user-id',
        projectId: 'project-id',
        organization: {
          id: 'org-id',
        },
        type: PrincipalType.USER,
      };
      const userToken = 'user-token';
      const integrationName = IntegrationName.SLACK_BOT;
      const generatedToken = 'generated-token';
      const encryptedToken = { iv: 'iv', data: 'encrypted-token' };
      const newId = 'new-id';

      mockAccessTokenManager.generateTokenGeneratorToken.mockResolvedValue(
        generatedToken,
      );
      mockEncryptUtils.encryptString.mockReturnValue(encryptedToken);
      mockOpenOpsId.mockReturnValue(newId);

      const result = await integrationAuthorizationService.connect({
        principal,
        userToken,
        integrationName,
      });

      expect(
        mockAccessTokenManager.generateTokenGeneratorToken,
      ).toHaveBeenCalledWith(userToken);
      expect(saveMock).toHaveBeenCalledWith({
        id: newId,
        userId: principal.id,
        projectId: principal.projectId,
        organizationId: principal.organization.id,
        integrationName,
        token: encryptedToken,
        isRevoked: false,
      });
      expect(result).toEqual({ token: generatedToken });
    });
  });

  describe('exists', () => {
    it('should return true if a non-revoked authorization exists', async () => {
      const userId = 'user-id';
      const projectId = 'project-id';
      const integrationName = IntegrationName.SLACK_BOT;

      (findOneByMock as any).mockResolvedValue({ id: 'auth-id' });

      const result = await integrationAuthorizationService.exists({
        userId,
        projectId,
        integrationName,
      });

      expect(findOneByMock).toHaveBeenCalledWith({
        userId,
        projectId,
        integrationName,
        isRevoked: false,
      });
      expect(result).toEqual({ exists: true });
    });

    it('should return false if no non-revoked authorization exists', async () => {
      const userId = 'user-id';
      const projectId = 'project-id';
      const integrationName = IntegrationName.SLACK_BOT;

      findOneByMock.mockResolvedValue(null as never);

      const result = await integrationAuthorizationService.exists({
        userId,
        projectId,
        integrationName,
      });

      expect(findOneByMock).toHaveBeenCalledWith({
        userId,
        projectId,
        integrationName,
        isRevoked: false,
      });
      expect(result).toEqual({ exists: false });
    });
  });
});
