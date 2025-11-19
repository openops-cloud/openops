const systemMock = {
  getBoolean: jest.fn(),
};
const encryptUtilsMock = {
  decryptString: jest.fn(),
};
const authenticateDefaultUserMock = jest.fn();

jest.mock('@openops/server-shared', () => ({
  system: systemMock,
  encryptUtils: encryptUtilsMock,
  AppSystemProp: {
    USE_DATABASE_TOKEN: 'USE_DATABASE_TOKEN',
  },
}));

jest.mock('../../src/lib/openops-tables/auth-user', () => ({
  authenticateDefaultUserInOpenOpsTables: authenticateDefaultUserMock,
}));

import { AppSystemProp } from '@openops/server-shared';
import {
  getProjectDatabaseToken,
  type GetEncryptedTokenFn,
} from '../../src/lib/openops-tables/get-project-database-token';

describe('get-project-database-token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectDatabaseToken', () => {
    it.each([[false], [undefined]])(
      'should return default token when USE_DATABASE_TOKEN is %s',
      async (useDatabaseTokenValue) => {
        systemMock.getBoolean.mockReturnValue(useDatabaseTokenValue);
        authenticateDefaultUserMock.mockResolvedValue({
          token: 'default-token',
        });

        const getEncryptedToken: GetEncryptedTokenFn = jest.fn();

        const result = await getProjectDatabaseToken(
          'project-id',
          getEncryptedToken,
        );

        expect(result).toBe('default-token');
        expect(systemMock.getBoolean).toHaveBeenCalledWith(
          AppSystemProp.USE_DATABASE_TOKEN,
        );
        expect(authenticateDefaultUserMock).toHaveBeenCalledTimes(1);
        expect(getEncryptedToken).not.toHaveBeenCalled();
      },
    );

    it('should return decrypted token when USE_DATABASE_TOKEN is true', async () => {
      systemMock.getBoolean.mockReturnValue(true);
      const encryptedToken = {
        iv: 'test-iv',
        data: 'test-data',
      };
      const getEncryptedToken: GetEncryptedTokenFn = jest
        .fn()
        .mockResolvedValue(encryptedToken);
      encryptUtilsMock.decryptString.mockReturnValue('decrypted-token');

      const result = await getProjectDatabaseToken(
        'project-id',
        getEncryptedToken,
      );

      expect(result).toBe('decrypted-token');
      expect(systemMock.getBoolean).toHaveBeenCalledWith(
        AppSystemProp.USE_DATABASE_TOKEN,
      );
      expect(getEncryptedToken).toHaveBeenCalledTimes(1);
      expect(getEncryptedToken).toHaveBeenCalledWith('project-id');
      expect(encryptUtilsMock.decryptString).toHaveBeenCalledWith(
        encryptedToken,
      );
      expect(authenticateDefaultUserMock).not.toHaveBeenCalled();
    });

    it('should handle errors from getEncryptedToken', async () => {
      systemMock.getBoolean.mockReturnValue(true);
      const error = new Error('Failed to get encrypted token');
      const getEncryptedToken: GetEncryptedTokenFn = jest
        .fn()
        .mockRejectedValue(error);

      await expect(
        getProjectDatabaseToken('project-id', getEncryptedToken),
      ).rejects.toThrow('Failed to get encrypted token');
    });
  });
});
