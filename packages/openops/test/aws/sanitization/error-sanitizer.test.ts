import { sanitizeAwsError } from '../../../src/lib/aws/sanitization/error-sanitizer';

describe('AWS Error Sanitizer', () => {
  describe('User and Role prefixed ARNs', () => {
    test('should sanitize IAM user ARN with User: prefix', () => {
      const error =
        'User: arn:aws:iam::123456789012:user/OpenOpsApp is not authorized';
      const result = sanitizeAwsError(error);

      expect(result).toBe(
        'User: arn:aws:iam::*****:user/**** is not authorized',
      );
      expect(result).not.toContain('OpenOpsApp');
      expect(result).not.toContain('123456789012');
    });

    test('should sanitize IAM role ARN with Role: prefix', () => {
      const error =
        'Role: arn:aws:iam::987654321098:role/AdminRole cannot perform action';
      const result = sanitizeAwsError(error);

      expect(result).toBe(
        'Role: arn:aws:iam::*****:role/**** cannot perform action',
      );
      expect(result).not.toContain('AdminRole');
      expect(result).not.toContain('987654321098');
    });

    test('should sanitize STS assumed-role ARN with Role: prefix', () => {
      const error =
        'Role: arn:aws:sts::123456789012:assumed-role/MyRole/session123 is not authorized';
      const result = sanitizeAwsError(error);

      expect(result).toBe(
        'Role: arn:aws:sts::*****:assumed-role/**** is not authorized',
      );
      expect(result).not.toContain('MyRole');
      expect(result).not.toContain('session123');
    });

    test('should sanitize policy ARN with User: prefix', () => {
      const error =
        'User: arn:aws:iam::123456789012:policy/MyCustomPolicy lacks permissions';
      const result = sanitizeAwsError(error);

      expect(result).toBe(
        'User: arn:aws:iam::*****:policy/**** lacks permissions',
      );
      expect(result).not.toContain('MyCustomPolicy');
    });
  });

  describe('Resource prefixed ARNs', () => {
    test('should sanitize role ARN with "on resource:" prefix', () => {
      const error =
        'User is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::111111111111:role/ProductionRole';
      const result = sanitizeAwsError(error);

      expect(result).toContain('on resource: arn:aws:iam::*****:role/****');
      expect(result).not.toContain('ProductionRole');
      expect(result).not.toContain('111111111111');
    });

    test('should sanitize service-role ARN with "on resource:" prefix', () => {
      const error =
        'Access denied on resource: arn:aws:iam::222222222222:role/service-role/MyLambdaRole';
      const result = sanitizeAwsError(error);

      expect(result).toContain('on resource: arn:aws:iam::*****:role/****');
      expect(result).not.toContain('service-role');
      expect(result).not.toContain('MyLambdaRole');
    });

    test('should sanitize user ARN with "on resource:" prefix', () => {
      const error =
        'Cannot delete on resource: arn:aws:iam::333333333333:user/ServiceAccount';
      const result = sanitizeAwsError(error);

      expect(result).toContain('on resource: arn:aws:iam::*****:user/****');
      expect(result).not.toContain('ServiceAccount');
    });

    test('should sanitize policy ARN with "on resource:" prefix', () => {
      const error =
        'Cannot attach on resource: arn:aws:iam::444444444444:policy/RestrictedPolicy';
      const result = sanitizeAwsError(error);

      expect(result).toContain('on resource: arn:aws:iam::*****:policy/****');
      expect(result).not.toContain('RestrictedPolicy');
    });
  });

  describe('Catch-all ARN patterns', () => {
    test('should sanitize ARNs in middle of sentence', () => {
      const error =
        'Cannot attach policy arn:aws:iam::123456789012:policy/MyCustomPolicy to role';
      const result = sanitizeAwsError(error);

      expect(result).toContain('arn:aws:iam::*****:policy/****');
      expect(result).not.toContain('MyCustomPolicy');
    });

    test('should sanitize ARNs in parentheses', () => {
      const error =
        'Failed to assume role (arn:aws:iam::987654321098:role/MyRole)';
      const result = sanitizeAwsError(error);

      expect(result).toBe(
        'Failed to assume role (arn:aws:iam::*****:role/****)',
      );
      expect(result).not.toContain('MyRole');
    });

    test('should sanitize multiple ARNs in same message', () => {
      const error =
        'User: arn:aws:iam::111111111111:user/UserA cannot assume role arn:aws:iam::222222222222:role/RoleB on resource: arn:aws:iam::333333333333:role/RoleC';
      const result = sanitizeAwsError(error);

      expect(result).toBe(
        'User: arn:aws:iam::*****:user/**** cannot assume role arn:aws:iam::*****:role/**** on resource: arn:aws:iam::*****:role/****',
      );
      expect(result).not.toContain('UserA');
      expect(result).not.toContain('RoleB');
      expect(result).not.toContain('RoleC');
      expect(result).not.toContain('111111111111');
      expect(result).not.toContain('222222222222');
      expect(result).not.toContain('333333333333');
    });

    test('should sanitize ARNs with commas nearby', () => {
      const error =
        'Invalid principals: arn:aws:iam::123456789012:user/User1, arn:aws:iam::456789012345:role/Role2';
      const result = sanitizeAwsError(error);

      expect(result).toBe(
        'Invalid principals: arn:aws:iam::*****:user/****, arn:aws:iam::*****:role/****',
      );
      expect(result).not.toContain('User1');
      expect(result).not.toContain('Role2');
    });
  });

  describe('Complex scenarios', () => {
    test('should handle real AWS AssumeRole error', () => {
      const error =
        'User: arn:aws:iam::295012473647:user/OpenOpsApp is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::111111111111:role/ProductionRole';
      const result = sanitizeAwsError(error);

      expect(result).toBe(
        'User: arn:aws:iam::*****:user/**** is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::*****:role/****',
      );
      expect(result).not.toContain('OpenOpsApp');
      expect(result).not.toContain('ProductionRole');
      expect(result).not.toContain('295012473647');
      expect(result).not.toContain('111111111111');
    });

    test('should handle service-role path in error', () => {
      const error =
        'User: arn:aws:iam::123456789012:user/ops is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::111111111111:role/service-role/MyLambdaRole';
      const result = sanitizeAwsError(error);

      expect(result).toContain('User: arn:aws:iam::*****:user/****');
      expect(result).toContain('on resource: arn:aws:iam::*****:role/****');
      expect(result).not.toContain('ops');
      expect(result).not.toContain('service-role/MyLambdaRole');
    });

    test('should preserve non-ARN content', () => {
      const error =
        'User: arn:aws:iam::123456789012:user/Admin is not authorized to perform: sts:AssumeRole';
      const result = sanitizeAwsError(error);

      expect(result).toContain('is not authorized to perform: sts:AssumeRole');
      expect(result).not.toContain('Admin');
    });

    test('should handle empty string', () => {
      expect(sanitizeAwsError('')).toBe('');
    });

    test('should handle message with no ARNs', () => {
      const error = 'Invalid credentials provided';
      expect(sanitizeAwsError(error)).toBe('Invalid credentials provided');
    });
  });
});
