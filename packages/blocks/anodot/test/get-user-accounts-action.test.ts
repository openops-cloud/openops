import { logger } from '@openops/server-shared';
import { createUmbrellaSession } from '../src/lib/common/auth';
import { listRawUmbrellaAccounts } from '../src/lib/common/umbrella-accounts';
import { getUserAccountsAction } from '../src/lib/get-user-accounts-action';

jest.mock('../src/lib/common/auth', () => ({
  createUmbrellaSession: jest.fn(),
}));
jest.mock('../src/lib/common/umbrella-accounts', () => ({
  listRawUmbrellaAccounts: jest.fn(),
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

  const session = {
    version: '1.0',
    apiUrl: 'apiUrl',
    tokens: { Authorization: 'bearer', apikey: 'user-key:-1' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns the provider account list when successful', async () => {
    (createUmbrellaSession as jest.Mock).mockResolvedValue(session);
    (listRawUmbrellaAccounts as jest.Mock).mockResolvedValue(['acc1', 'acc2']);

    const result = await getUserAccountsAction.run(context as any);

    expect(createUmbrellaSession).toHaveBeenCalledWith(context.auth);
    expect(listRawUmbrellaAccounts).toHaveBeenCalledWith(session);
    expect(result).toEqual(['acc1', 'acc2']);
  });

  test('throws and logs error when an exception occurs', async () => {
    (createUmbrellaSession as jest.Mock).mockRejectedValue(new Error('fail'));

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
