const getUmbrellaAccountByIdMock = jest.fn();

jest.mock('../../src/lib/common/umbrella-accounts', () => ({
  getUmbrellaAccountById: getUmbrellaAccountByIdMock,
}));

import { getAccountApiKey } from '../../src/lib/common/account';
import { UmbrellaSession } from '../../src/lib/common/auth';

describe('getAccountApiKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const session: UmbrellaSession = {
    version: '1.0',
    apiUrl: 'some url',
    tokens: {
      Authorization: 'a bearer token',
      apikey: 'an account:-1',
    },
  };

  test('should propagate lookup failures', async () => {
    getUmbrellaAccountByIdMock.mockRejectedValue(
      new Error('No account matching account id: 123456789 was found.'),
    );

    await expect(getAccountApiKey('123456789', session)).rejects.toThrow(
      'No account matching account id: 123456789 was found.',
    );

    expect(getUmbrellaAccountByIdMock).toHaveBeenCalledTimes(1);
    expect(getUmbrellaAccountByIdMock).toHaveBeenCalledWith(
      session,
      '123456789',
    );
  });

  test('should build a 1.0 key from the resolved account', async () => {
    getUmbrellaAccountByIdMock.mockResolvedValue({
      accountId: '987654321',
      accountKey: 2,
      divisionId: 0,
      accountName: 'account 2',
    });

    const result = await getAccountApiKey('987654321', session);

    expect(result).toBe('an account:2:0');
  });

  test('should build a 2.0 key with a blank cost center segment', async () => {
    getUmbrellaAccountByIdMock.mockResolvedValue({
      accountId: '225220305501',
      accountKey: '225220305501',
      accountName: 'BillingTransferTest',
    });

    const result = await getAccountApiKey('225220305501', {
      ...session,
      version: '2.0',
    });

    expect(result).toBe('an account:225220305501:');
  });
});
