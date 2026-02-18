import {
  ApplicationError,
  ErrorCode,
} from '../src/lib/common/application-error';
import { assertValidPassword } from '../src/lib/password-validation';

describe('assertValidPassword', () => {
  test.each([
    'ValidP@ssw0rd',
    'P@ssw0rd',
    '12345678',
    'password',
    'Aa1!@#$%^&*()_+-=[]{};"\\\':|,.<>/?',
    'P@ssw0rd'.repeat(8),
  ])(
    'should not throw an error for a valid password',
    (validPassword: string) => {
      expect(() => assertValidPassword(validPassword)).not.toThrow();
    },
  );

  it('should throw an error for a password that is too short', () => {
    const shortPassword = 'P@ssw0r';
    expect(() => assertValidPassword(shortPassword)).toThrow(ApplicationError);
    expect(() => assertValidPassword(shortPassword)).toThrow(
      new ApplicationError({
        code: ErrorCode.INVALID_USER_PASSWORD,
        params: {
          message: `Password must be between 8 and 64 characters.`,
        },
      }),
    );
  });

  it('should throw an error for a password that is too long', () => {
    const longPassword = 'P@ssw0rd'.repeat(8) + 'a';
    expect(() => assertValidPassword(longPassword)).toThrow(ApplicationError);
    expect(() => assertValidPassword(longPassword)).toThrow(
      new ApplicationError({
        code: ErrorCode.INVALID_USER_PASSWORD,
        params: {
          message: `Password must be between 8 and 64 characters.`,
        },
      }),
    );
  });

  test.each(['Password123§', 'Password123€', 'Password 123@'])(
    'should throw an error for a password with invalid characters',
    (invalidCharPassword: string) => {
      expect(() => assertValidPassword(invalidCharPassword)).toThrow(
        ApplicationError,
      );
      expect(() => assertValidPassword(invalidCharPassword)).toThrow(
        new ApplicationError({
          code: ErrorCode.INVALID_USER_PASSWORD,
          params: {
            message:
              'Password contains invalid characters. Only alphanumeric and common special characters are allowed.',
          },
        }),
      );
    },
  );
});
