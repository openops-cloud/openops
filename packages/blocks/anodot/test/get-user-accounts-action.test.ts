import { logger } from '@openops/server-shared';
import { authenticateUserWithAnodot } from '../src/lib/common/auth';
import { getAnodotUsers } from '../src/lib/common/users';
import { getUserAccountsAction } from '../src/lib/get-user-accounts-action';

jest.mock('../src/lib/common/auth', () => ({
  authenticateUserWithAnodot: jest.fn(),
}));
jest.mock('../src/lib/common/users', () => ({
  getAnodotUsers: jest.fn(),
}));
jest.mock('@openops/server-shared', () => ({
  logger: { warn: jest.fn() },
}));

describe('getUserAccountsAction.run', () => {
  const context = {
    auth: {
      authUrl: 'authUrl',
      apiUrl: 'apiUrl',
      username: 'user',
      password: 'pass',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns accounts when successful', async () => {
    (authenticateUserWithAnodot as jest.Mock).mockResolvedValue({
      token: 'token',
    });
    (getAnodotUsers as jest.Mock).mockResolvedValue({
      accounts: ['acc1', 'acc2'],
    });

    const result = await getUserAccountsAction.run(context as any);

    expect(authenticateUserWithAnodot).toHaveBeenCalledWith(
      'authUrl',
      'user',
      'pass',
    );
    expect(getAnodotUsers).toHaveBeenCalledWith('apiUrl', { token: 'token' });
    expect(result).toEqual(['acc1', 'acc2']);
  });

  test('throws and logs error when an exception occurs', async () => {
    (authenticateUserWithAnodot as jest.Mock).mockRejectedValue(
      new Error('fail'),
    );

    await expect(getUserAccountsAction.run(context as any)).rejects.toThrow(
      /An error occurred while fetching Umbrella user accounts: Error: fail/,
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'An error occurred while fetching Umbrella user accounts: Error: fail',
      ),
    );
  });
});
