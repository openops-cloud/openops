/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
const mockGetAccountId = jest.fn();
const mockAssumeRole = jest.fn();

jest.mock('../../src/lib/aws/sts-common', () => ({
  getAccountId: mockGetAccountId,
  assumeRole: mockAssumeRole,
}));

const mockSystem = {
  getBoolean: jest.fn().mockReturnValue(false),
};

jest.mock('@openops/server-shared', () => ({
  system: mockSystem,
  SharedSystemProp: {
    AWS_ENABLE_IMPLICIT_ROLE: 'AWS_ENABLE_IMPLICIT_ROLE',
    ENABLE_HOST_SESSION: 'ENABLE_HOST_SESSION',
    AWS_USE_AZURE_MANAGED_IDENTITY: 'AWS_USE_AZURE_MANAGED_IDENTITY',
  },
}));

import {
  amazonAuth,
  getAwsAccountsMultiSelectDropdown,
  getAwsAccountsSingleSelectDropdown,
  getCredentialsForAccount,
  getCredentialsFromAuth,
  getCredentialsListFromAuth,
  getRoleForAccount,
} from '../../src/lib/aws/auth';

const EXAMPLE_ACCESS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const EXAMPLE_SECRET_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
const DEFAULT_REGION = 'us-east-1';
const LOCALSTACK_ENDPOINT = 'http://localhost:4566';

function createAuthObject(overrides: any = {}) {
  return {
    defaultRegion: DEFAULT_REGION,
    accessKeyId: EXAMPLE_ACCESS_KEY,
    secretAccessKey: EXAMPLE_SECRET_KEY,
    ...overrides,
  };
}

function createRole(
  arnSuffix: string,
  accountName: string,
  externalId?: string,
) {
  return {
    assumeRoleArn: `arn:aws:iam::${arnSuffix}:role/${accountName}Role`,
    accountName,
    ...(externalId && { assumeRoleExternalId: externalId }),
  };
}

function mockSuccessfulAssumeRole() {
  mockAssumeRole.mockResolvedValue({
    AccessKeyId: 'ASIATEMP',
    SecretAccessKey: 'tempSecret',
    SessionToken: 'tempToken',
  });
}

function mockSuccessfulAccountId() {
  mockGetAccountId.mockResolvedValue('123456789012');
}

async function reimportAuthWithImplicitRole() {
  mockSystem.getBoolean.mockImplementation((prop) => {
    if (prop === 'AWS_ENABLE_IMPLICIT_ROLE') return true;
    return false;
  });
  jest.resetModules();
  const { amazonAuth: freshAmazonAuth } = await import(
    '../../src/lib/aws/auth'
  );
  return freshAmazonAuth;
}

async function reimportAuthWithAzureFederation() {
  mockSystem.getBoolean.mockImplementation((prop) => {
    if (prop === 'AWS_ENABLE_IMPLICIT_ROLE') return true;
    if (prop === 'AWS_USE_AZURE_MANAGED_IDENTITY') return true;
    return false;
  });
  jest.resetModules();
  const { amazonAuth: freshAmazonAuth } = await import(
    '../../src/lib/aws/auth'
  );
  return freshAmazonAuth;
}

describe('AWS Auth Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSystem.getBoolean.mockReturnValue(false);
  });

  describe('Field validation', () => {
    test('should fail when defaultRegion is missing', async () => {
      const result = await amazonAuth.validate!({
        auth: {
          accessKeyId: EXAMPLE_ACCESS_KEY,
          secretAccessKey: EXAMPLE_SECRET_KEY,
        } as any,
      });

      expect(result).toEqual({
        valid: false,
        error: 'Default region is required',
      });
    });

    test('should fail when accessKeyId is missing and implicit role disabled', async () => {
      const result = await amazonAuth.validate!({
        auth: {
          defaultRegion: DEFAULT_REGION,
          secretAccessKey: EXAMPLE_SECRET_KEY,
        } as any,
      });

      expect(result).toEqual({
        valid: false,
        error: 'Access Key ID and Secret Access Key are required',
      });
    });

    test('should fail when secretAccessKey is missing and implicit role disabled', async () => {
      const result = await amazonAuth.validate!({
        auth: {
          defaultRegion: DEFAULT_REGION,
          accessKeyId: EXAMPLE_ACCESS_KEY,
        } as any,
      });

      expect(result).toEqual({
        valid: false,
        error: 'Access Key ID and Secret Access Key are required',
      });
    });
  });

  describe('Base credentials validation', () => {
    test('should validate successfully with correct base credentials', async () => {
      mockSuccessfulAccountId();

      const result = await amazonAuth.validate!({
        auth: createAuthObject(),
      });

      expect(result).toEqual({ valid: true });
      expect(mockGetAccountId).toHaveBeenCalledWith(
        {
          accessKeyId: EXAMPLE_ACCESS_KEY,
          secretAccessKey: EXAMPLE_SECRET_KEY,
          endpoint: undefined,
        },
        DEFAULT_REGION,
      );
    });

    test('should fail with invalid base credentials', async () => {
      mockGetAccountId.mockRejectedValue(
        new Error('The security token included in the request is invalid'),
      );

      const result = await amazonAuth.validate!({
        auth: createAuthObject({
          accessKeyId: 'INVALID_KEY',
          secretAccessKey: 'INVALID_SECRET',
        }),
      });

      expect(result).toEqual({
        valid: false,
        error: 'The security token included in the request is invalid',
      });
    });

    test('should pass endpoint to getAccountId when provided', async () => {
      mockSuccessfulAccountId();

      await amazonAuth.validate!({
        auth: createAuthObject({ endpoint: LOCALSTACK_ENDPOINT }),
      });

      expect(mockGetAccountId).toHaveBeenCalledWith(
        {
          accessKeyId: EXAMPLE_ACCESS_KEY,
          secretAccessKey: EXAMPLE_SECRET_KEY,
          endpoint: LOCALSTACK_ENDPOINT,
        },
        DEFAULT_REGION,
      );
    });
  });

  describe('Implicit role validation', () => {
    test('should succeed when implicit role enabled, no credentials and no roles', async () => {
      const freshAmazonAuth = await reimportAuthWithImplicitRole();
      mockSuccessfulAccountId();

      const result = await freshAmazonAuth.validate!({
        auth: {
          defaultRegion: DEFAULT_REGION,
        } as any,
      });

      expect(result).toEqual({
        valid: true,
      });
      expect(mockGetAccountId).toHaveBeenCalled();
    });

    test('should fail when azure federation and implicit role enabled, no credentials and no roles', async () => {
      const freshAmazonAuth = await reimportAuthWithAzureFederation();

      const result = await freshAmazonAuth.validate!({
        auth: {
          defaultRegion: DEFAULT_REGION,
        } as any,
      });

      expect(result).toEqual({
        valid: false,
        error: 'Either credentials or at least one role must be provided',
      });
    });

    test('should NOT skip base credentials validation when implicit role enabled and no credentials provided', async () => {
      const freshAmazonAuth = await reimportAuthWithImplicitRole();
      mockSuccessfulAccountId();

      const result = await freshAmazonAuth.validate!({
        auth: {
          defaultRegion: DEFAULT_REGION,
          roles: [createRole('111111111111', 'Prod')],
        } as any,
      });

      expect(result.valid).toBe(true);
      expect(mockGetAccountId).toHaveBeenCalled();
    });

    test('should validate base credentials when implicit role enabled but credentials provided', async () => {
      const freshAmazonAuth = await reimportAuthWithImplicitRole();
      mockSuccessfulAccountId();

      const result = await freshAmazonAuth.validate!({
        auth: createAuthObject({
          roles: [createRole('111111111111', 'Prod')],
        }),
      });

      expect(result.valid).toBe(true);
      expect(mockGetAccountId).toHaveBeenCalled();
    });
  });

  describe('Role validation', () => {
    test('should validate all roles successfully', async () => {
      mockSuccessfulAccountId();
      mockSuccessfulAssumeRole();

      const result = await amazonAuth.validate!({
        auth: createAuthObject({
          roles: [
            createRole('111111111111', 'Production'),
            createRole('222222222222', 'Staging', 'external123'),
          ],
        }),
      });

      expect(result).toEqual({ valid: true });
      expect(mockAssumeRole).toHaveBeenCalledTimes(2);
      expect(mockAssumeRole).toHaveBeenNthCalledWith(
        1,
        EXAMPLE_ACCESS_KEY,
        EXAMPLE_SECRET_KEY,
        DEFAULT_REGION,
        'arn:aws:iam::111111111111:role/ProductionRole',
        undefined,
        undefined,
      );
      expect(mockAssumeRole).toHaveBeenNthCalledWith(
        2,
        EXAMPLE_ACCESS_KEY,
        EXAMPLE_SECRET_KEY,
        DEFAULT_REGION,
        'arn:aws:iam::222222222222:role/StagingRole',
        'external123',
        undefined,
      );
    });

    test('should pass endpoint to assumeRole when provided', async () => {
      mockSuccessfulAccountId();
      mockSuccessfulAssumeRole();

      const result = await amazonAuth.validate!({
        auth: createAuthObject({
          endpoint: LOCALSTACK_ENDPOINT,
          roles: [createRole('111111111111', 'Production')],
        }),
      });

      expect(result).toEqual({ valid: true });
      expect(mockAssumeRole).toHaveBeenCalledWith(
        EXAMPLE_ACCESS_KEY,
        EXAMPLE_SECRET_KEY,
        DEFAULT_REGION,
        'arn:aws:iam::111111111111:role/ProductionRole',
        undefined,
        LOCALSTACK_ENDPOINT,
      );
    });

    test('should fail when first role validation fails', async () => {
      mockSuccessfulAccountId();
      mockAssumeRole.mockRejectedValue(
        new Error(
          'User: arn:aws:iam::123456789012:user/ops is not authorized to perform: sts:AssumeRole',
        ),
      );

      const result = await amazonAuth.validate!({
        auth: createAuthObject({
          roles: [createRole('111111111111', 'Production')],
        }),
      });

      expect(result).toEqual({
        valid: false,
        error:
          'role "arn:aws:iam::111111111111:role/ProductionRole" (Production): User: arn:aws:iam::123456789012:user/ops is not authorized to perform: sts:AssumeRole',
      });
    });

    test('should fail on second role when first succeeds but second fails', async () => {
      mockSuccessfulAccountId();
      mockAssumeRole
        .mockResolvedValueOnce({
          AccessKeyId: 'ASIATEMP',
          SecretAccessKey: 'tempSecret',
          SessionToken: 'tempToken',
        })
        .mockRejectedValueOnce(new Error('External ID mismatch'));

      const result = await amazonAuth.validate!({
        auth: createAuthObject({
          roles: [
            createRole('111111111111', 'Production'),
            createRole('222222222222', 'Staging', 'wrong-external-id'),
          ],
        }),
      });

      expect(result).toEqual({
        valid: false,
        error:
          'role "arn:aws:iam::222222222222:role/StagingRole" (Staging): External ID mismatch',
      });
      expect(mockAssumeRole).toHaveBeenCalledTimes(2);
    });

    test('should validate roles using implicit role credentials when no explicit credentials provided', async () => {
      mockSuccessfulAccountId();
      mockSuccessfulAssumeRole();
      const freshAmazonAuth = await reimportAuthWithImplicitRole();

      const result = await freshAmazonAuth.validate!({
        auth: {
          defaultRegion: DEFAULT_REGION,
          roles: [createRole('111111111111', 'Production')],
        } as any,
      });

      expect(result).toEqual({ valid: true });
      expect(mockAssumeRole).toHaveBeenCalledWith(
        '',
        '',
        DEFAULT_REGION,
        'arn:aws:iam::111111111111:role/ProductionRole',
        undefined,
        undefined,
      );
    });

    test('should validate roles in batches of 5', async () => {
      mockSuccessfulAssumeRole();
      const roles = Array.from({ length: 7 }, (_, i) =>
        createRole(`11111111111${i}`, `Account${i}`),
      );

      const result = await amazonAuth.validate!({
        auth: createAuthObject({ roles }),
      });

      expect(result.valid).toBe(true);
      expect(mockAssumeRole).toHaveBeenCalledTimes(7);
    });

    test('should fail early if a batch fails', async () => {
      mockAssumeRole
        .mockResolvedValueOnce({}) // 1
        .mockResolvedValueOnce({}) // 2
        .mockRejectedValueOnce(new Error('Batch fail')); // 3

      const roles = Array.from({ length: 6 }, (_, i) =>
        createRole(`11111111111${i}`, `Account${i}`),
      );

      const result = await amazonAuth.validate!({
        auth: createAuthObject({ roles }),
      });

      expect(result.valid).toBe(false);
      expect((result as any).error).toContain('Batch fail');
      // It should have called 5 times for the first batch, and failed at the first rejection in Promise.all
      // but wait, validateRoleBatch uses Promise.allSettled and then checks results.
      // so for a batch of 5, it will always call assumeRole 5 times.
      expect(mockAssumeRole).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error handling', () => {
    test('should handle non-Error exceptions gracefully', async () => {
      mockGetAccountId.mockRejectedValue('string error');

      const result = await amazonAuth.validate!({
        auth: createAuthObject(),
      });

      expect(result).toEqual({
        valid: false,
        error: 'Unknown error',
      });
    });

    test('should handle non-Error exceptions in role validation', async () => {
      mockSuccessfulAccountId();
      mockAssumeRole.mockRejectedValue({ code: 'AccessDenied' });

      const result = await amazonAuth.validate!({
        auth: createAuthObject({
          roles: [createRole('111111111111', 'Production')],
        }),
      });

      expect(result).toEqual({
        valid: false,
        error:
          'role "arn:aws:iam::111111111111:role/ProductionRole" (Production): Unknown error',
      });
    });
  });

  describe('Auth property structure', () => {
    test('should have expected properties', () => {
      expect(amazonAuth.authProviderKey).toBe('AWS');
      expect(amazonAuth.displayName).toBe('Connection');
      expect(amazonAuth.type).toBe('CUSTOM_AUTH');
      expect(amazonAuth.required).toBe(true);

      expect(amazonAuth.props.defaultRegion.displayName).toBe('Default Region');
      expect(amazonAuth.props.defaultRegion.required).toBe(true);
      expect(amazonAuth.props.defaultRegion.defaultValue).toBe('us-east-1');

      expect(amazonAuth.props.accessKeyId.type).toBe('SECRET_TEXT');
      expect(amazonAuth.props.secretAccessKey.type).toBe('SECRET_TEXT');

      expect(amazonAuth.props.endpoint.displayName).toBe(
        'Custom Endpoint (optional)',
      );
      expect(amazonAuth.props.endpoint.required).toBe(false);

      expect(amazonAuth.props.roles.type).toBe('ARRAY');
      expect(amazonAuth.props.roles.required).toBe(false);
    });

    test('should mark credentials as optional when implicit role enabled', async () => {
      const freshAmazonAuth = await reimportAuthWithImplicitRole();

      expect(freshAmazonAuth.props.accessKeyId.displayName).toContain(
        'optional',
      );
      expect(freshAmazonAuth.props.secretAccessKey.displayName).toContain(
        'optional',
      );
      expect(freshAmazonAuth.props.accessKeyId.required).toBe(false);
      expect(freshAmazonAuth.props.secretAccessKey.required).toBe(false);
    });
  });

  describe('getCredentialsFromAuth', () => {
    test('should return base credentials if no assumeRoleArn is provided', async () => {
      const auth = createAuthObject();
      const result = await getCredentialsFromAuth(auth);

      expect(result).toEqual({
        accessKeyId: EXAMPLE_ACCESS_KEY,
        secretAccessKey: EXAMPLE_SECRET_KEY,
        endpoint: undefined,
      });
      expect(mockAssumeRole).not.toHaveBeenCalled();
    });

    test('should return assumed role credentials if assumeRoleArn is provided', async () => {
      mockSuccessfulAssumeRole();
      const auth = createAuthObject({
        assumeRoleArn: 'arn:aws:iam::123456789012:role/TestRole',
        assumeRoleExternalId: 'ext-id',
      });
      const result = await getCredentialsFromAuth(auth);

      expect(result).toEqual({
        accessKeyId: 'ASIATEMP',
        secretAccessKey: 'tempSecret',
        sessionToken: 'tempToken',
        endpoint: undefined,
      });
      expect(mockAssumeRole).toHaveBeenCalledWith(
        EXAMPLE_ACCESS_KEY,
        EXAMPLE_SECRET_KEY,
        DEFAULT_REGION,
        'arn:aws:iam::123456789012:role/TestRole',
        'ext-id',
        undefined,
      );
    });
  });

  describe('getCredentialsListFromAuth', () => {
    test('should return base credentials if no roles are provided', async () => {
      const auth = createAuthObject();
      const result = await getCredentialsListFromAuth(auth);

      expect(result).toEqual([
        {
          accessKeyId: EXAMPLE_ACCESS_KEY,
          secretAccessKey: EXAMPLE_SECRET_KEY,
          endpoint: undefined,
        },
      ]);
    });

    test('should return assumed role credentials for specified accounts', async () => {
      mockSuccessfulAssumeRole();
      const auth = createAuthObject({
        roles: [
          createRole('111111111111', 'Prod'),
          createRole('222222222222', 'Dev'),
        ],
      });

      const result = await getCredentialsListFromAuth(auth, ['111111111111']);

      expect(result).toHaveLength(1);
      expect(result[0].accessKeyId).toBe('ASIATEMP');
      expect(mockAssumeRole).toHaveBeenCalledTimes(1);
      expect(mockAssumeRole).toHaveBeenCalledWith(
        EXAMPLE_ACCESS_KEY,
        EXAMPLE_SECRET_KEY,
        DEFAULT_REGION,
        'arn:aws:iam::111111111111:role/ProdRole',
        undefined,
        undefined,
      );
    });

    test('should handle implicit role in getCredentialsListFromAuth when credentials missing', async () => {
      mockSuccessfulAssumeRole();
      const auth = {
        defaultRegion: DEFAULT_REGION,
        roles: [createRole('111111111111', 'Prod')],
      };

      const result = await getCredentialsListFromAuth(auth, ['111111111111']);
      expect(result[0].accessKeyId).toBe('ASIATEMP');
      expect(mockAssumeRole).toHaveBeenCalledWith(
        undefined,
        undefined,
        DEFAULT_REGION,
        'arn:aws:iam::111111111111:role/ProdRole',
        undefined,
        undefined,
      );
    });

    test('should throw error if no matching roles found for accounts', async () => {
      const auth = createAuthObject({
        roles: [createRole('111111111111', 'Prod')],
      });

      await expect(
        getCredentialsListFromAuth(auth, ['222222222222']),
      ).rejects.toThrow('No credentials found for accounts');
    });

    test('should return multiple assumed role credentials', async () => {
      mockAssumeRole.mockResolvedValueOnce({
        AccessKeyId: 'AK1',
        SecretAccessKey: 'SK1',
      });
      mockAssumeRole.mockResolvedValueOnce({
        AccessKeyId: 'AK2',
        SecretAccessKey: 'SK2',
      });

      const auth = createAuthObject({
        roles: [
          createRole('111111111111', 'Prod'),
          createRole('222222222222', 'Dev'),
        ],
      });

      const result = await getCredentialsListFromAuth(auth, [
        '111111111111',
        '222222222222',
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].accessKeyId).toBe('AK1');
      expect(result[1].accessKeyId).toBe('AK2');
    });
  });

  describe('getCredentialsForAccount', () => {
    test('should return credentials for a single account', async () => {
      mockSuccessfulAssumeRole();
      const auth = createAuthObject({
        roles: [createRole('111111111111', 'Prod')],
      });

      const result = await getCredentialsForAccount(auth, '111111111111');

      expect(result.accessKeyId).toBe('ASIATEMP');
      expect(mockAssumeRole).toHaveBeenCalledWith(
        EXAMPLE_ACCESS_KEY,
        EXAMPLE_SECRET_KEY,
        DEFAULT_REGION,
        'arn:aws:iam::111111111111:role/ProdRole',
        undefined,
        undefined,
      );
    });
  });

  describe('getRoleForAccount', () => {
    test('should return the role for a specific accountId', () => {
      const role1 = createRole('111111111111', 'Prod');
      const role2 = createRole('222222222222', 'Dev');
      const auth = { roles: [role1, role2] };

      const result = getRoleForAccount(auth, '111111111111');
      expect(result).toEqual(role1);
    });

    test('should throw error if role is not found', () => {
      const auth = { roles: [createRole('111111111111', 'Prod')] };

      expect(() => getRoleForAccount(auth, '333333333333')).toThrow(
        'Role not found for account',
      );
    });

    test('should return undefined if roles array is empty', () => {
      const auth = { roles: [] };
      expect(getRoleForAccount(auth, '111111111111')).toBeUndefined();
    });
  });

  describe('Dropdowns', () => {
    test('getAwsAccountsMultiSelectDropdown should return a dynamic property', () => {
      const dropdown = getAwsAccountsMultiSelectDropdown();
      expect(dropdown.accounts).toBeDefined();
      expect(dropdown.accounts.refreshers).toContain('auth');
    });

    test('getAwsAccountsSingleSelectDropdown should return a dynamic property', () => {
      const dropdown = getAwsAccountsSingleSelectDropdown();
      expect(dropdown.accounts).toBeDefined();
      expect(dropdown.accounts.refreshers).toContain('auth');
    });

    test('dropdown props function should handle empty roles', async () => {
      const dropdown = getAwsAccountsSingleSelectDropdown() as any;
      const props = await dropdown.accounts.props({ auth: {} }, {} as any);
      expect(props['accounts']).toEqual({});
    });

    test('dropdown props function should map roles to options for single select', async () => {
      const dropdown = getAwsAccountsSingleSelectDropdown() as any;
      const auth = {
        roles: [
          {
            accountName: 'Prod',
            assumeRoleArn: 'arn:aws:iam::111111111111:role/ProdRole',
          },
        ],
      };
      const props = await dropdown.accounts.props({ auth }, {} as any);
      expect(props['accounts'].options.options).toEqual([
        { label: 'Prod', value: '111111111111' },
      ]);
      expect(props['accounts'].displayName).toBe('Account');
    });

    test('dropdown props function should map roles to options for multi select', async () => {
      const dropdown = getAwsAccountsMultiSelectDropdown() as any;
      const auth = {
        roles: [
          {
            accountName: 'Prod',
            assumeRoleArn: 'arn:aws:iam::111111111111:role/ProdRole',
          },
        ],
      };
      const props = await dropdown.accounts.props({ auth }, {} as any);
      expect(props['accounts'].options.options).toEqual([
        { label: 'Prod', value: '111111111111' },
      ]);
      expect(props['accounts'].displayName).toBe('Accounts');
    });
  });
});
