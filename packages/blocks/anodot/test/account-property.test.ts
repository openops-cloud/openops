const createUmbrellaSessionMock = jest.fn();
const listUmbrellaAccountsMock = jest.fn();

jest.mock('../src/lib/common/auth', () => ({
  createUmbrellaSession: createUmbrellaSessionMock,
}));

jest.mock('../src/lib/common/umbrella-accounts', () => ({
  listUmbrellaAccounts: listUmbrellaAccountsMock,
}));

import {
  accountProperty,
  accountSingleSelectProperty,
} from '../src/lib/account-property';

const auth = {
  authUrl: 'auth url',
  apiUrl: 'api url',
  username: 'user',
  password: 'pass',
};

const session = {
  version: '1.0',
  apiUrl: 'api url',
  tokens: { Authorization: 'bearer', apikey: 'user-key:-1' },
};

const um1Accounts = [
  {
    accountId: '932213950603',
    accountKey: 16376,
    divisionId: 0,
    accountName: 'direct account',
  },
];

const um2Accounts = [
  {
    accountId: '225220305501',
    accountKey: '225220305501',
    accountName: 'BillingTransferTest',
  },
];

async function getOptions(property: { options: any }, authValue: unknown) {
  return property.options({ auth: authValue }, {} as any);
}

describe('account properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createUmbrellaSessionMock.mockResolvedValue(session);
  });

  test('should declare a required multi select and a required single select', () => {
    expect(accountProperty()).toMatchObject({
      required: true,
      type: 'MULTI_SELECT_DROPDOWN',
      refreshers: ['auth'],
    });
    expect(accountSingleSelectProperty()).toMatchObject({
      required: true,
      type: 'DROPDOWN',
      refreshers: ['auth'],
    });
  });

  test.each([[accountProperty()], [accountSingleSelectProperty()]])(
    'should be disabled until a connection is selected',
    async (property) => {
      const result = await getOptions(property, undefined);

      expect(result).toEqual({
        disabled: true,
        options: [],
        placeholder: 'Please authenticate first',
      });
      expect(createUmbrellaSessionMock).not.toHaveBeenCalled();
    },
  );

  test('should expose 1.0 accounts with the exact persisted value shape', async () => {
    listUmbrellaAccountsMock.mockResolvedValue(um1Accounts);

    const result = await getOptions(accountProperty(), auth);

    expect(createUmbrellaSessionMock).toHaveBeenCalledWith(auth);
    expect(listUmbrellaAccountsMock).toHaveBeenCalledWith(session);
    expect(result).toStrictEqual({
      disabled: false,
      options: [
        {
          label: 'direct account',
          value: {
            accountId: '932213950603',
            accountKey: 16376,
            divisionId: 0,
            accountName: 'direct account',
          },
        },
      ],
    });
  });

  test('should expose 2.0 accounts without a divisionId', async () => {
    listUmbrellaAccountsMock.mockResolvedValue(um2Accounts);

    const result = await getOptions(accountSingleSelectProperty(), auth);

    expect(result).toStrictEqual({
      disabled: false,
      options: [
        {
          label: 'BillingTransferTest',
          value: {
            accountId: '225220305501',
            accountKey: '225220305501',
            accountName: 'BillingTransferTest',
          },
        },
      ],
    });
  });

  test('should be disabled with a placeholder when there are no accounts', async () => {
    listUmbrellaAccountsMock.mockResolvedValue([]);

    const result = await getOptions(accountProperty(), auth);

    expect(result).toEqual({
      disabled: true,
      options: [],
      placeholder: 'No user accounts found in Umbrella.',
    });
  });

  test('should surface the error message when listing fails', async () => {
    listUmbrellaAccountsMock.mockRejectedValue(new Error('Forbidden'));

    const result = await getOptions(accountProperty(), auth);

    expect(result).toEqual({
      disabled: true,
      error: 'Forbidden',
      options: [],
      placeholder: 'Could not fetch Umbrella user accounts',
    });
  });
});
