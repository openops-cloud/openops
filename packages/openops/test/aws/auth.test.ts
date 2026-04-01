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

describe('AWS Auth Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSystem.getBoolean.mockReturnValue(false); // Default: implicit role disabled
  });

  describe('Field validation', () => {
    test('should fail when defaultRegion is missing', async () => {
      const result = await amazonAuth.validate!({
        auth: {
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
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
          defaultRegion: 'us-east-1',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
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
          defaultRegion: 'us-east-1',
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
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
      mockGetAccountId.mockResolvedValue('123456789012');

      const result = await amazonAuth.validate!({
        auth: {
          defaultRegion: 'us-east-1',
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        } as any,
      });

      expect(result).toEqual({ valid: true });
      expect(mockGetAccountId).toHaveBeenCalledWith(
        {
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          endpoint: undefined,
        },
        'us-east-1',
      );
    });

    test('should fail with invalid base credentials', async () => {
      mockGetAccountId.mockRejectedValue(
        new Error('The security token included in the request is invalid'),
      );

      const result = await amazonAuth.validate!({
        auth: {
          defaultRegion: 'us-east-1',
          accessKeyId: 'INVALID_KEY',
          secretAccessKey: 'INVALID_SECRET',
        } as any,
      });

      expect(result).toEqual({
        valid: false,
        error: 'The security token included in the request is invalid',
      });
    });

    test('should pass endpoint to getAccountId when provided', async () => {
      mockGetAccountId.mockResolvedValue('123456789012');

      await amazonAuth.validate!({
        auth: {
          defaultRegion: 'us-east-1',
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          endpoint: 'http://localhost:4566',
        } as any,
      });

      expect(mockGetAccountId).toHaveBeenCalledWith(
        {
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          endpoint: 'http://localhost:4566',
        },
        'us-east-1',
      );
    });
  });

  describe('Implicit role validation', () => {
    test('should validate with GetCallerIdentity when implicit role enabled and no credentials', async () => {
      mockSystem.getBoolean.mockReturnValue(true);
      mockGetAccountId.mockResolvedValue('123456789012');

      // Re-import to get fresh auth with new system setting
      jest.resetModules();
      mockSystem.getBoolean.mockReturnValue(true);
      const { amazonAuth: freshAmazonAuth } = await import(
        '../../src/lib/aws/auth'
      );

      const result = await freshAmazonAuth.validate!({
        auth: {
          defaultRegion: 'us-east-1',
        } as any,
      });

      expect(result).toEqual({ valid: true });
      expect(mockGetAccountId).toHaveBeenCalledWith(
        {
          accessKeyId: '',
          secretAccessKey: '',
          endpoint: undefined,
        },
        'us-east-1',
      );
    });

    test('should fail when implicit role validation fails', async () => {
      mockSystem.getBoolean.mockReturnValue(true);
      mockGetAccountId.mockRejectedValue(
        new Error('Unable to locate credentials'),
      );

      jest.resetModules();
      mockSystem.getBoolean.mockReturnValue(true);
      const { amazonAuth: freshAmazonAuth } = await import(
        '../../src/lib/aws/auth'
      );

      const result = await freshAmazonAuth.validate!({
        auth: {
          defaultRegion: 'us-east-1',
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
      mockGetAccountId.mockResolvedValue('123456789012');
      mockAssumeRole.mockResolvedValue({
        AccessKeyId: 'ASIATEMP',
        SecretAccessKey: 'tempSecret',
        SessionToken: 'tempToken',
      });

      const result = await amazonAuth.validate!({
        auth: {
          defaultRegion: 'us-east-1',
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          roles: [
            {
              assumeRoleArn: 'arn:aws:iam::111111111111:role/ProductionRole',
              accountName: 'Production',
            },
            {
              assumeRoleArn: 'arn:aws:iam::222222222222:role/StagingRole',
              accountName: 'Staging',
              assumeRoleExternalId: 'external123',
            },
          ],
        } as any,
      });

      expect(result).toEqual({ valid: true });
      expect(mockAssumeRole).toHaveBeenCalledTimes(2);
      expect(mockAssumeRole).toHaveBeenNthCalledWith(
        1,
        'AKIAIOSFODNN7EXAMPLE',
        'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'us-east-1',
        'arn:aws:iam::111111111111:role/ProductionRole',
        undefined,
      );
      expect(mockAssumeRole).toHaveBeenNthCalledWith(
        2,
        'AKIAIOSFODNN7EXAMPLE',
        'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'us-east-1',
        'arn:aws:iam::222222222222:role/StagingRole',
        'external123',
      );
    });

    test('should fail when first role validation fails', async () => {
      mockGetAccountId.mockResolvedValue('123456789012');
      mockAssumeRole.mockRejectedValue(
        new Error(
          'User: arn:aws:iam::123456789012:user/ops is not authorized to perform: sts:AssumeRole',
        ),
      );

      const result = await amazonAuth.validate!({
        auth: {
          defaultRegion: 'us-east-1',
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          roles: [
            {
              assumeRoleArn: 'arn:aws:iam::111111111111:role/ProductionRole',
              accountName: 'Production',
            },
          ],
        } as any,
      });

      expect(result).toEqual({
        valid: false,
        error:
          'Role "arn:aws:iam::111111111111:role/ProductionRole" (Production): User: arn:aws:iam::*****:user/**** is not authorized to perform: sts:AssumeRole',
      });
    });

    test('should fail on second role when first succeeds but second fails', async () => {
      mockGetAccountId.mockResolvedValue('123456789012');
      mockAssumeRole
        .mockResolvedValueOnce({
          AccessKeyId: 'ASIATEMP',
          SecretAccessKey: 'tempSecret',
          SessionToken: 'tempToken',
        })
        .mockRejectedValueOnce(new Error('External ID mismatch'));

      const result = await amazonAuth.validate!({
        auth: {
          defaultRegion: 'us-east-1',
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          roles: [
            {
              assumeRoleArn: 'arn:aws:iam::111111111111:role/ProductionRole',
              accountName: 'Production',
            },
            {
              assumeRoleArn: 'arn:aws:iam::222222222222:role/StagingRole',
              accountName: 'Staging',
              assumeRoleExternalId: 'wrong-external-id',
            },
          ],
        } as any,
      });

      expect(result).toEqual({
        valid: false,
        error:
          'Role "arn:aws:iam::222222222222:role/StagingRole" (Staging): External ID mismatch',
      });
      expect(mockAssumeRole).toHaveBeenCalledTimes(2);
    });

    test('should validate roles using implicit role credentials when no explicit credentials provided', async () => {
      mockSystem.getBoolean.mockReturnValue(true);
      mockGetAccountId.mockResolvedValue('123456789012');
      mockAssumeRole.mockResolvedValue({
        AccessKeyId: 'ASIATEMP',
        SecretAccessKey: 'tempSecret',
        SessionToken: 'tempToken',
      });

      jest.resetModules();
      mockSystem.getBoolean.mockReturnValue(true);
      const { amazonAuth: freshAmazonAuth } = await import(
        '../../src/lib/aws/auth'
      );

      const result = await freshAmazonAuth.validate!({
        auth: {
          defaultRegion: 'us-east-1',
          roles: [
            {
              assumeRoleArn: 'arn:aws:iam::111111111111:role/ProductionRole',
              accountName: 'Production',
            },
          ],
        } as any,
      });

      expect(result).toEqual({ valid: true });
      expect(mockAssumeRole).toHaveBeenCalledWith(
        '',
        '',
        'us-east-1',
        'arn:aws:iam::111111111111:role/ProductionRole',
        undefined,
      );
    });
  });

  describe('Error handling', () => {
    test('should handle non-Error exceptions gracefully', async () => {
      mockGetAccountId.mockRejectedValue('string error');

      const result = await amazonAuth.validate!({
        auth: {
          defaultRegion: 'us-east-1',
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        } as any,
      });

      expect(result).toEqual({
        valid: false,
        error: 'Unknown error',
      });
    });

    test('should handle non-Error exceptions in role validation', async () => {
      mockGetAccountId.mockResolvedValue('123456789012');
      mockAssumeRole.mockRejectedValue({ code: 'AccessDenied' });

      const result = await amazonAuth.validate!({
        auth: {
          defaultRegion: 'us-east-1',
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          roles: [
            {
              assumeRoleArn: 'arn:aws:iam::111111111111:role/ProductionRole',
              accountName: 'Production',
            },
          ],
        } as any,
      });

      expect(result).toEqual({
        valid: false,
        error:
          'Role "arn:aws:iam::111111111111:role/ProductionRole" (Production): Unknown error',
      });
    });

    test('should sanitize IAM principal names in error messages', async () => {
      mockGetAccountId.mockResolvedValue('123456789012');
      mockAssumeRole.mockRejectedValue(
        new Error(
          'User: arn:aws:iam::295012473647:user/OpenOpsApp is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::111111111111:role/ProductionRole',
        ),
      );

      const result = await amazonAuth.validate!({
        auth: {
          defaultRegion: 'us-east-1',
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          roles: [
            {
              assumeRoleArn: 'arn:aws:iam::111111111111:role/ProductionRole',
              accountName: 'Production',
            },
          ],
        } as any,
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        // IAM principal name should be redacted
        expect(result.error).not.toContain('OpenOpsApp');
        expect(result.error).toContain('User: arn:aws:iam::*****:user/****');
        // Resource ARN should also be sanitized
        expect(result.error).toContain(
          'on resource: arn:aws:iam::*****:role/****',
        );
      }
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
      mockSystem.getBoolean.mockReturnValue(true);
      jest.resetModules();
      mockSystem.getBoolean.mockReturnValue(true);
      const { amazonAuth: freshAmazonAuth } = await import(
        '../../src/lib/aws/auth'
      );

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
