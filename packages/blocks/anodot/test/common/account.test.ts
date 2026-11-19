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

  const session10: UmbrellaSession = {
    version: '1.0',
    apiUrl: 'some url',
    tokens: {
      Authorization: 'a bearer token',
      apikey: 'an account:-1',
    },
  };

  const session20: UmbrellaSession = { ...session10, version: '2.0' };

  test('should propagate 1.0 lookup failures', async () => {
    getUmbrellaAccountByIdMock.mockRejectedValue(
      new Error('No account matching account id: 123456789 was found.'),
    );

    await expect(getAccountApiKey('123456789', session10)).rejects.toThrow(
      'No account matching account id: 123456789 was found.',
    );

    expect(getUmbrellaAccountByIdMock).toHaveBeenCalledTimes(1);
    expect(getUmbrellaAccountByIdMock).toHaveBeenCalledWith(
      session10,
      '123456789',
    );
  });

  test('should resolve the 1.0 account and build the key from its key and division', async () => {
    getUmbrellaAccountByIdMock.mockResolvedValue({
      accountId: '987654321',
      accountKey: 2,
      divisionId: 0,
      accountName: 'account 2',
    });

    const result = await getAccountApiKey('987654321', session10);

    expect(result).toBe('an account:2:0');
  });

  test('should build the 2.0 key from the account id without a lookup', async () => {
    const result = await getAccountApiKey('225220305501', session20);

    expect(result).toBe('an account:225220305501:');
    expect(getUmbrellaAccountByIdMock).not.toHaveBeenCalled();
  });
});
