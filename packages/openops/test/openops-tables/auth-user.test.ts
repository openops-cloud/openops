const systemMock = {
  get: jest.fn(),
  getNumber: jest.fn().mockReturnValue(10),
};

jest.mock('@openops/server-shared', () => ({
  system: systemMock,
  AppSystemProp: {
    TABLES_TOKEN_LIFETIME_MINUTES: 'TABLES_TOKEN_LIFETIME_MINUTES',
  },
}));

const makeOpenOpsTablesPostMock = jest.fn();
jest.mock('../../src/lib/openops-tables/requests-helpers', () => {
  return { makeOpenOpsTablesPost: makeOpenOpsTablesPostMock };
});

import { AxiosHeaders } from 'axios';
import { authenticateUserInOpenOpsTables } from '../../src/lib/openops-tables/auth-user';

describe('authUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return tokens on successful authentication', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    const token = 'test_token';
    const refresh_token = 'test_refresh_token';

    makeOpenOpsTablesPostMock.mockResolvedValue({
      token,
      refresh_token,
    });

    const result = await authenticateUserInOpenOpsTables(email, password);

    expect(result).toEqual({ token, refresh_token });
    expect(makeOpenOpsTablesPostMock).toHaveBeenCalledWith(
      'api/user/token-auth/',
      { email, password },
      new AxiosHeaders({ 'Content-Type': 'application/json' }),
      undefined,
    );
  });

  it('should log an error and throw an exception on failed authentication', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    const errorMessage = 'Authentication failed';

    makeOpenOpsTablesPostMock.mockRejectedValue(new Error(errorMessage));

    await expect(
      authenticateUserInOpenOpsTables(email, password),
    ).rejects.toThrow(errorMessage);

    expect(makeOpenOpsTablesPostMock).toHaveBeenCalledWith(
      'api/user/token-auth/',
      { email, password },
      new AxiosHeaders({ 'Content-Type': 'application/json' }),
      undefined,
    );
  });
});
