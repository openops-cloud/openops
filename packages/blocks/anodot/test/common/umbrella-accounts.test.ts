const getAnodotUsersMock = jest.fn();
const getUm2AccountsMock = jest.fn();

jest.mock('../../src/lib/common/users', () => ({
  getAnodotUsers: getAnodotUsersMock,
}));

jest.mock('../../src/lib/common/um2-accounts', () => ({
  getUm2Accounts: getUm2AccountsMock,
}));

import { UmbrellaSession } from '../../src/lib/common/auth';
import {
  getUmbrellaAccountById,
  listRawUmbrellaAccounts,
  listUmbrellaAccounts,
} from '../../src/lib/common/umbrella-accounts';

const tokens = { Authorization: 'bearer', apikey: 'user-key:-1' };

const session10: UmbrellaSession = {
  version: '1.0',
  apiUrl: 'api-url',
  tokens,
};

const session20: UmbrellaSession = {
  version: '2.0',
  apiUrl: 'api-url',
  tokens,
};

const um1User = {
  id: 1,
  user_key: 'user-key',
  user_name: 'user',
  user_display_name: 'user',
  user_type: '2',
  accounts: [
    {
      accountKey: 16376,
      accountId: '932213950603',
      accountTypeId: 1,
      accountName: 'direct account',
      divisionId: 0,
    },
    {
      accountKey: 42,
      accountId: '111111111111',
      accountTypeId: 1,
      accountName: 'reseller sub account',
      divisionId: 7,
    },
  ],
};

const um2Accounts = [
  {
    accountKey: '225220305501',
    accountId: '225220305501',
    accountName: 'BillingTransferTest',
    cloudTypeId: 0,
    isAllAccounts: false,
    isDirectAccount: false,
    isOwnedByReseller: false,
  },
  {
    accountKey: 'mspprodtest_tenant_multicloud',
    accountId: 'mspprodtest_tenant_multicloud',
    accountName: 'ALL ACCOUNTS MULTICLOUD',
    cloudTypeId: 4,
    isAllAccounts: true,
    isDirectAccount: false,
    isOwnedByReseller: false,
  },
];

describe('listUmbrellaAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAnodotUsersMock.mockResolvedValue(um1User);
    getUm2AccountsMock.mockResolvedValue(um2Accounts);
  });

  test('should map 1.0 accounts keeping numeric key and division id, including 0', async () => {
    const result = await listUmbrellaAccounts(session10);

    expect(getAnodotUsersMock).toHaveBeenCalledWith('api-url', tokens);
    expect(getUm2AccountsMock).not.toHaveBeenCalled();
    expect(result).toStrictEqual([
      {
        accountId: '932213950603',
        accountKey: 16376,
        divisionId: 0,
        accountName: 'direct account',
      },
      {
        accountId: '111111111111',
        accountKey: 42,
        divisionId: 7,
        accountName: 'reseller sub account',
      },
    ]);
  });

  test('should return an empty list when the 1.0 user has no accounts', async () => {
    getAnodotUsersMock.mockResolvedValue({ ...um1User, accounts: undefined });

    const result = await listUmbrellaAccounts(session10);

    expect(result).toStrictEqual([]);
  });

  test('should map 2.0 accounts without a divisionId key', async () => {
    const result = await listUmbrellaAccounts(session20);

    expect(getUm2AccountsMock).toHaveBeenCalledWith('api-url', tokens);
    expect(getAnodotUsersMock).not.toHaveBeenCalled();
    expect(result).toStrictEqual([
      {
        accountId: '225220305501',
        accountKey: '225220305501',
        accountName: 'BillingTransferTest',
      },
      {
        accountId: 'mspprodtest_tenant_multicloud',
        accountKey: 'mspprodtest_tenant_multicloud',
        accountName: 'ALL ACCOUNTS MULTICLOUD',
      },
    ]);
    expect(result[0]).not.toHaveProperty('divisionId');
  });

  test('should return an empty list when the 2.0 endpoint returns a non-array', async () => {
    getUm2AccountsMock.mockResolvedValue(undefined);

    const result = await listUmbrellaAccounts(session20);

    expect(result).toStrictEqual([]);
  });

  test('should propagate provider errors', async () => {
    getUm2AccountsMock.mockRejectedValue(new Error('Accounts service error'));

    await expect(listUmbrellaAccounts(session20)).rejects.toThrow(
      'Accounts service error',
    );
  });
});

describe('listRawUmbrellaAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAnodotUsersMock.mockResolvedValue(um1User);
    getUm2AccountsMock.mockResolvedValue(um2Accounts);
  });

  test('should return the provider 1.0 accounts unchanged', async () => {
    const result = await listRawUmbrellaAccounts(session10);

    expect(result).toStrictEqual(um1User.accounts);
  });

  test('should return the provider 2.0 accounts unchanged', async () => {
    const result = await listRawUmbrellaAccounts(session20);

    expect(result).toStrictEqual(um2Accounts);
  });
});

describe('getUmbrellaAccountById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAnodotUsersMock.mockResolvedValue(um1User);
    getUm2AccountsMock.mockResolvedValue(um2Accounts);
  });

  test('should return the matching 1.0 account', async () => {
    const result = await getUmbrellaAccountById(session10, '111111111111');

    expect(result).toStrictEqual({
      accountId: '111111111111',
      accountKey: 42,
      divisionId: 7,
      accountName: 'reseller sub account',
    });
  });

  test('should return the matching 2.0 account', async () => {
    const result = await getUmbrellaAccountById(session20, '225220305501');

    expect(result).toStrictEqual({
      accountId: '225220305501',
      accountKey: '225220305501',
      accountName: 'BillingTransferTest',
    });
  });

  test('should throw the existing message when no account matches', async () => {
    await expect(getUmbrellaAccountById(session20, 'missing')).rejects.toThrow(
      'No account matching account id: missing was found.',
    );
  });
});
