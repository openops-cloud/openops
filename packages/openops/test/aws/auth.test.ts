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
  },
}));

import { amazonAuth } from '../../src/lib/aws/auth';

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
  mockSystem.getBoolean.mockReturnValue(true);
  jest.resetModules();
  mockSystem.getBoolean.mockReturnValue(true);
  const { amazonAuth: freshAmazonAuth } =
    await import('../../src/lib/aws/auth');
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
    test('should validate with GetCallerIdentity when implicit role enabled and no credentials', async () => {
      mockSuccessfulAccountId();
      const freshAmazonAuth = await reimportAuthWithImplicitRole();

      const result = await freshAmazonAuth.validate!({
        auth: {
          defaultRegion: DEFAULT_REGION,
        } as any,
      });

      expect(result).toEqual({ valid: true });
      expect(mockGetAccountId).toHaveBeenCalledWith(
        {
          accessKeyId: '',
          secretAccessKey: '',
          endpoint: undefined,
        },
        DEFAULT_REGION,
      );
    });

    test('should fail when implicit role validation fails', async () => {
      mockGetAccountId.mockRejectedValue(
        new Error('Unable to locate credentials'),
      );
      const freshAmazonAuth = await reimportAuthWithImplicitRole();

      const result = await freshAmazonAuth.validate!({
        auth: {
          defaultRegion: DEFAULT_REGION,
        } as any,
      });

      expect(result).toEqual({
        valid: false,
        error: 'Unable to locate credentials',
      });
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
          '1 of 1 roles could not be assumed:\n' +
          '- 111111111111 (arn:aws:iam::111111111111:role/ProductionRole): User: arn:aws:iam::123456789012:user/ops is not authorized to perform: sts:AssumeRole',
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
          '1 of 2 roles could not be assumed:\n' +
          '- 222222222222 (arn:aws:iam::222222222222:role/StagingRole): External ID mismatch',
      });
      expect(mockAssumeRole).toHaveBeenCalledTimes(2);
    });

    test('should report both failures when two roles fail in the same batch', async () => {
      mockSuccessfulAccountId();
      mockAssumeRole
        .mockRejectedValueOnce(new Error('AccessDenied'))
        .mockResolvedValueOnce({ AccessKeyId: 'ASIATEMP' })
        .mockRejectedValueOnce(new Error('NoSuchEntity'));

      const result = await amazonAuth.validate!({
        auth: createAuthObject({
          roles: [
            createRole('111111111111', 'Production'),
            createRole('222222222222', 'Staging'),
            createRole('333333333333', 'Dev'),
          ],
        }),
      });

      expect(result).toEqual({
        valid: false,
        error:
          '2 of 3 roles could not be assumed:\n' +
          '- 111111111111 (arn:aws:iam::111111111111:role/ProductionRole): AccessDenied\n' +
          '- 333333333333 (arn:aws:iam::333333333333:role/DevRole): NoSuchEntity',
      });
      expect(mockAssumeRole).toHaveBeenCalledTimes(3);
    });

    test('should keep validating later batches and report failures across batches', async () => {
      mockSuccessfulAccountId();
      const roles = Array.from({ length: 7 }, (_, i) =>
        createRole(String(i + 1).repeat(12), `Account${i + 1}`),
      );
      mockAssumeRole.mockImplementation((_k, _s, _r, arn: string) => {
        if (arn === roles[0].assumeRoleArn || arn === roles[6].assumeRoleArn) {
          return Promise.reject(new Error(`cannot assume ${arn}`));
        }
        return Promise.resolve({ AccessKeyId: 'ASIATEMP' });
      });

      const result = await amazonAuth.validate!({
        auth: createAuthObject({ roles }),
      });

      expect(mockAssumeRole).toHaveBeenCalledTimes(7);
      expect(result).toEqual({
        valid: false,
        error:
          '2 of 7 roles could not be assumed:\n' +
          '- 111111111111 (arn:aws:iam::111111111111:role/Account1Role): cannot assume arn:aws:iam::111111111111:role/Account1Role\n' +
          '- 777777777777 (arn:aws:iam::777777777777:role/Account7Role): cannot assume arn:aws:iam::777777777777:role/Account7Role',
      });
    });

    test('should report every failing role without truncation', async () => {
      mockSuccessfulAccountId();
      mockAssumeRole.mockRejectedValue(new Error('AccessDenied'));
      const roles = Array.from({ length: 13 }, (_, i) =>
        createRole(String(100000000000 + i), `Account${i}`),
      );

      const result = await amazonAuth.validate!({
        auth: createAuthObject({ roles }),
      });

      expect(result.valid).toBe(false);
      const lines = (result as { error: string }).error.split('\n');
      expect(lines[0]).toBe('13 of 13 roles could not be assumed:');
      expect(lines.filter((line) => line.startsWith('- '))).toHaveLength(13);
      expect(lines).toHaveLength(14);
      expect(lines[13]).toContain('100000000012');
    });

    test('should fall back to the account alias when the ARN cannot be parsed', async () => {
      mockSuccessfulAccountId();
      mockAssumeRole.mockRejectedValue(new Error('AccessDenied'));

      const result = await amazonAuth.validate!({
        auth: createAuthObject({
          roles: [
            {
              assumeRoleArn: 'not-a-valid-arn',
              accountName: 'Broken',
            },
          ],
        }),
      });

      expect(result).toEqual({
        valid: false,
        error:
          '1 of 1 roles could not be assumed:\n' +
          '- Broken (not-a-valid-arn): AccessDenied',
      });
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
          '1 of 1 roles could not be assumed:\n' +
          '- 111111111111 (arn:aws:iam::111111111111:role/ProductionRole): Unknown error',
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
});
