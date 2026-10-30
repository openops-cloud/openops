const systemMock = {
  get: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  system: systemMock,
}));

const makeHttpRequestMock = jest.fn();
jest.mock('@openops/common', () => {
  return {
    makeHttpRequest: makeHttpRequestMock,
  };
});

import { AxiosHeaders } from 'axios';
import { getUm2Accounts, Um2Account } from '../../src/lib/common/um2-accounts';

describe('getUm2Accounts', () => {
  const tokens = {
    Authorization: 'authorization token',
    apikey: 'user-key:-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should request the user-management accounts endpoint with auth headers', async () => {
    const accounts: Um2Account[] = [
      {
        accountKey: '225220305501',
        accountId: '225220305501',
        accountName: 'BillingTransferTest',
        cloudTypeId: 0,
        isAllAccounts: false,
        isDirectAccount: false,
        isOwnedByReseller: false,
      },
    ];
    makeHttpRequestMock.mockResolvedValue(accounts);

    const result = await getUm2Accounts('base-url', tokens);

    expect(result).toStrictEqual(accounts);
    expect(makeHttpRequestMock).toHaveBeenCalledWith(
      'GET',
      'base-url/v2/user-management/accounts/management',
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: tokens.Authorization,
        apikey: tokens.apikey,
      }),
    );
  });

  it('should propagate request failures', async () => {
    makeHttpRequestMock.mockRejectedValue(new Error('Accounts service error'));

    await expect(getUm2Accounts('base-url', tokens)).rejects.toThrow(
      'Accounts service error',
    );
  });
});
