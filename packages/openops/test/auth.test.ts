const stsMock = {
  assumeRole: jest.fn(),
};

jest.mock('../src/lib/aws/sts-common.ts', () => stsMock);

import {
  getAwsAccountsMultiSelectDropdown,
  getCredentialsForAccount,
  getCredentialsFromAuth,
  getCredentialsListFromAuth,
  getRoleForAccount,
} from '../src/lib/aws/auth';

describe('getCredentialsFromAuth tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each([undefined, null, ''])(
    'should return the given credentials when assumeRoleArn is not set',
    async (assumeRoleArn) => {
      stsMock.assumeRole.mockResolvedValue({
        AccessKeyId: 'key id',
        SecretAccessKey: 'secret',
        SessionToken: 'token',
      });

      const auth = {
        accessKeyId: 'access key',
        secretAccessKey: 'some secret',
        assumeRoleArn: assumeRoleArn,
        assumeRoleExternalId: 'some external id',
      };

      const result = await getCredentialsFromAuth(auth);

      expect(result).toEqual({
        accessKeyId: 'access key',
        secretAccessKey: 'some secret',
      });

      expect(stsMock.assumeRole).not.toHaveBeenCalled();
    },
  );

  test('should return assumed-role credentials when assumeRoleArn is set', async () => {
    stsMock.assumeRole.mockResolvedValue({
      AccessKeyId: 'key id',
      SecretAccessKey: 'secret',
      SessionToken: 'token',
    });

    const auth = {
      accessKeyId: 'access key',
      secretAccessKey: 'some secret',
      defaultRegion: 'some region',
      assumeRoleArn: 'some role',
      assumeRoleExternalId: 'some external id',
    };

    const result = await getCredentialsFromAuth(auth);

    expect(result).toEqual({
      accessKeyId: 'key id',
      secretAccessKey: 'secret',
      sessionToken: 'token',
    });

    expect(stsMock.assumeRole).toHaveBeenCalledTimes(1);
    expect(stsMock.assumeRole).toHaveBeenCalledWith(
      'access key',
      'some secret',
      'some region',
      'some role',
      'some external id',
      undefined,
    );
  });

  test('should throw if assumeRoleArn is set and failed to assume role', async () => {
    stsMock.assumeRole.mockRejectedValue(new Error('some error'));

    const auth = {
      accessKeyId: 'access key',
      secretAccessKey: 'some secret',
      defaultRegion: 'some region',
      assumeRoleArn: 'some role',
      assumeRoleExternalId: 'some external id',
    };

    await expect(getCredentialsFromAuth(auth)).rejects.toThrow('some error');
  });
});

describe('getAwsAccountsMultiSelectDropdown tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should have accounts property with correct values', () => {
    const commonProperties = getAwsAccountsMultiSelectDropdown();
    expect(commonProperties.accounts.refreshers).toEqual(['auth']);
    expect(commonProperties.accounts.required).toBe(true);
    expect(commonProperties.accounts.type).toEqual('DYNAMIC');
  });

  test('should return dropdown', async () => {
    const auth = {
      roles: [
        {
          assumeRoleArn: 'arn:aws:iam::1:user/roleName',
          accountName: 'account name1',
        },
        {
          assumeRoleArn: 'arn:aws:iam::2:user/roleName',
          accountName: 'account name2',
        },
      ],
    };
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {},
    };

    const result = await getAwsAccountsMultiSelectDropdown().accounts.props(
      { auth: auth },
      context,
    );

    expect(result).toMatchObject({
      accounts: {
        description: 'Select one or more accounts from the list',
        displayName: 'Accounts',
        required: true,
        type: 'STATIC_MULTI_SELECT_DROPDOWN',
        options: {
          disabled: false,
          options: [
            { label: 'account name1', value: '1' },
            { label: 'account name2', value: '2' },
          ],
        },
      },
    });
  });

  test.each([{ key: 'key id' }, { roles: [] }, {}, undefined])(
    'should return empty property if roles are empty / undefined',
    async (auth: any) => {
      const context = {
        ...jest.requireActual('@openops/blocks-framework'),
        auth: auth,
        propsValue: {},
      };

      const result = await getAwsAccountsMultiSelectDropdown().accounts.props(
        { auth: auth },
        context,
      );

      expect(result).toMatchObject({});
    },
  );
});

describe('getCredentialsListFromAuth tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return main credentials without any roles', async () => {
    const result = await getCredentialsListFromAuth({
      accessKeyId: 'access key',
      secretAccessKey: 'some secret',
      defaultRegion: 'region',
    });

    expect(result).toEqual([
      { accessKeyId: 'access key', secretAccessKey: 'some secret' },
    ]);
    expect(stsMock.assumeRole).not.toHaveBeenCalled();
  });

  test('should return role credentials with provided roles and accountIds', async () => {
    stsMock.assumeRole.mockResolvedValueOnce({
      AccessKeyId: 'key id',
      SecretAccessKey: 'secret',
      SessionToken: 'token',
    });

    const result = await getCredentialsListFromAuth(
      {
        accessKeyId: 'access key',
        secretAccessKey: 'some secret',
        defaultRegion: 'region',
        roles: [
          {
            assumeRoleArn: 'arn:aws:iam::1:user/roleName',
            accountName: 'account name1',
            assumeRoleExternalId: 'externalId',
          },
          {
            assumeRoleArn: 'arn:aws:iam::2:user/roleName2',
            accountName: 'account name2',
            assumeRoleExternalId: 'externalId2',
          },
        ],
      },
      ['2'],
    );

    expect(result).toEqual([
      {
        accessKeyId: 'key id',
        secretAccessKey: 'secret',
        sessionToken: 'token',
      },
    ]);
    expect(stsMock.assumeRole).toHaveBeenCalledTimes(1);
    expect(stsMock.assumeRole).toHaveBeenNthCalledWith(
      1,
      'access key',
      'some secret',
      'region',
      'arn:aws:iam::2:user/roleName2',
      'externalId2',
      undefined,
    );
  });

  test('should throw if no credentials were generated with provided roles', async () => {
    await expect(
      getCredentialsListFromAuth(
        {
          accessKeyId: 'access key',
          secretAccessKey: 'some secret',
          defaultRegion: 'region',
          roles: [
            {
              assumeRoleArn: 'arn:aws:iam::1:user/roleName',
              accountName: 'account name1',
              assumeRoleExternalId: 'externalId',
            },
            {
              assumeRoleArn: 'arn:aws:iam::2:user/roleName2',
              accountName: 'account name2',
              assumeRoleExternalId: 'externalId2',
            },
          ],
        },
        ['3'],
      ),
    ).rejects.toThrow('No credentials found for account');

    expect(stsMock.assumeRole).not.toHaveBeenCalled();
  });

  test('should not throw if account ids were provided without roles (to support when passing an accountId from ARN without roles)', async () => {
    const result = await getCredentialsListFromAuth(
      {
        accessKeyId: 'access key',
        secretAccessKey: 'some secret',
        defaultRegion: 'region',
        roles: [],
      },
      ['3'],
    );

    expect(result).toEqual([
      { accessKeyId: 'access key', secretAccessKey: 'some secret' },
    ]);

    expect(stsMock.assumeRole).not.toHaveBeenCalled();
  });
});

describe('getCredentialsForAccount tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return main credentials without any roles', async () => {
    const result = await getCredentialsForAccount({
      accessKeyId: 'access key',
      secretAccessKey: 'some secret',
      defaultRegion: 'region',
    });

    expect(result).toEqual({
      accessKeyId: 'access key',
      secretAccessKey: 'some secret',
    });
    expect(stsMock.assumeRole).not.toHaveBeenCalled();
  });

  test('should return role credential with provided roles and accountId', async () => {
    stsMock.assumeRole.mockResolvedValueOnce({
      AccessKeyId: 'key id',
      SecretAccessKey: 'secret',
      SessionToken: 'token',
    });

    const result = await getCredentialsForAccount(
      {
        accessKeyId: 'access key',
        secretAccessKey: 'some secret',
        defaultRegion: 'region',
        roles: [
          {
            assumeRoleArn: 'arn:aws:iam::1:user/roleName',
            accountName: 'account name1',
            assumeRoleExternalId: 'externalId',
          },
          {
            assumeRoleArn: 'arn:aws:iam::2:user/roleName2',
            accountName: 'account name2',
            assumeRoleExternalId: 'externalId2',
          },
        ],
      },
      '2',
    );

    expect(result).toEqual({
      accessKeyId: 'key id',
      secretAccessKey: 'secret',
      sessionToken: 'token',
    });
    expect(stsMock.assumeRole).toHaveBeenCalledTimes(1);
    expect(stsMock.assumeRole).toHaveBeenNthCalledWith(
      1,
      'access key',
      'some secret',
      'region',
      'arn:aws:iam::2:user/roleName2',
      'externalId2',
      undefined,
    );
  });

  test('should return main credentials when there are no roles but accountId is provided (to support when passing an accountId from ARN without roles)', async () => {
    const result = await getCredentialsForAccount(
      {
        accessKeyId: 'access key',
        secretAccessKey: 'some secret',
        defaultRegion: 'region',
      },
      'some account id',
    );

    expect(result).toEqual({
      accessKeyId: 'access key',
      secretAccessKey: 'some secret',
    });
    expect(stsMock.assumeRole).not.toHaveBeenCalled();
  });
});

describe('getRoleForAccount tests', () => {
  test('should return account of role', async () => {
    const result = getRoleForAccount(
      {
        roles: [
          {
            assumeRoleArn: 'arn:aws:iam::1:service/resource1',
            accountName: 'name1',
          },
          {
            assumeRoleArn: 'arn:aws:iam::2:service/resource2',
            accountName: 'name2',
          },
          {
            assumeRoleArn: 'arn:aws:iam::3:service/resource3',
            accountName: 'name3',
          },
        ],
      },
      '2',
    );

    expect(result).toEqual({
      accountName: 'name2',
      assumeRoleArn: 'arn:aws:iam::2:service/resource2',
    });
  });

  test.each([{ roles: [] }, {}])(
    'should return undefined if there are no roles or roles are empty',
    async (auth) => {
      const result = getRoleForAccount(auth, '2');

      expect(result).toEqual(undefined);
    },
  );

  test('should throw if no role was found', async () => {
    expect(() =>
      getRoleForAccount(
        {
          roles: [
            {
              assumeRoleArn: 'arn:aws:iam::1:service/resource1',
              accountName: 'name1',
            },
          ],
        },
        '4',
      ),
    ).toThrowError('Role not found for account');
  });
});
