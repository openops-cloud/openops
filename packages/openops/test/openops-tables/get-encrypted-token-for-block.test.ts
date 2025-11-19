const httpRequestMock = jest.fn();
jest.mock('../../src/lib/axios-wrapper', () => ({
  makeHttpRequest: httpRequestMock,
}));

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

import { AxiosHeaders } from 'axios';
import {
  createGetEncryptedTokenForBlock,
  getProjectDatabaseTokenForBlock,
} from '../../src/lib/openops-tables/get-encrypted-token-for-block';

describe('get-encrypted-token-for-block', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGetEncryptedTokenForBlock', () => {
    it.each([
      ['https://api.example.com', 'https://api.example.com/v1/worker/project'],
      ['https://api.example.com/', 'https://api.example.com/v1/worker/project'],
    ])(
      'should create a function that retrieves encrypted token from API (apiUrl: %s)',
      async (apiUrl, expectedUrl) => {
        const authToken = 'test-auth-token';
        const encryptedToken = {
          iv: 'test-iv',
          data: 'test-data',
        };

        httpRequestMock.mockResolvedValue({
          tablesDatabaseToken: encryptedToken,
        });

        const getEncryptedToken = createGetEncryptedTokenForBlock(
          apiUrl,
          authToken,
        );
        const result = await getEncryptedToken('project-id');

        expect(result).toEqual(encryptedToken);
        expect(httpRequestMock).toHaveBeenCalledTimes(1);
        expect(httpRequestMock).toHaveBeenCalledWith(
          'GET',
          expectedUrl,
          expect.any(AxiosHeaders),
        );

        const headers = httpRequestMock.mock.calls[0][2] as AxiosHeaders;
        expect(headers.get('Content-Type')).toBe('application/json');
        expect(headers.get('Authorization')).toBe(`Bearer ${authToken}`);
      },
    );

    it('should handle API errors', async () => {
      const apiUrl = 'https://api.example.com';
      const authToken = 'test-auth-token';
      const error = new Error('API Error');

      httpRequestMock.mockRejectedValue(error);

      const getEncryptedToken = createGetEncryptedTokenForBlock(
        apiUrl,
        authToken,
      );

      await expect(getEncryptedToken('project-id')).rejects.toThrow(
        'API Error',
      );
    });
  });

  describe('getProjectDatabaseTokenForBlock', () => {
    it('should return default token when USE_DATABASE_TOKEN is false', async () => {
      systemMock.getBoolean.mockReturnValue(false);
      authenticateDefaultUserMock.mockResolvedValue({
        token: 'default-token',
      });

      const result = await getProjectDatabaseTokenForBlock(
        'https://api.example.com',
        'test-token',
        'project-id',
      );

      expect(result).toBe('default-token');
      expect(systemMock.getBoolean).toHaveBeenCalled();
      expect(authenticateDefaultUserMock).toHaveBeenCalledTimes(1);
      expect(httpRequestMock).not.toHaveBeenCalled();
    });

    it('should return decrypted token when USE_DATABASE_TOKEN is true', async () => {
      systemMock.getBoolean.mockReturnValue(true);
      httpRequestMock.mockResolvedValue({
        tablesDatabaseToken: {
          iv: 'test-iv',
          data: 'test-data',
        },
      });
      encryptUtilsMock.decryptString.mockReturnValue('decrypted-token');

      const result = await getProjectDatabaseTokenForBlock(
        'https://api.example.com',
        'test-token',
        'project-id',
      );

      expect(result).toBe('decrypted-token');
      expect(systemMock.getBoolean).toHaveBeenCalled();
      expect(httpRequestMock).toHaveBeenCalledTimes(1);
      expect(encryptUtilsMock.decryptString).toHaveBeenCalledWith({
        iv: 'test-iv',
        data: 'test-data',
      });
      expect(authenticateDefaultUserMock).not.toHaveBeenCalled();
    });
  });
});
