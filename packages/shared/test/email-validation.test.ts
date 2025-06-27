import {
  ApplicationError,
  ErrorCode,
} from '../src/lib/common/application-error';
import { assertValidEmail } from '../src/lib/email-validation';

describe('assertValidEmail', () => {
  test.each([
    'test@example.com',
    'user.name@domain.com',
    'user-name@domain.com',
    'username123@domain.co.uk',
    'user+name@domain.org',
  ])('should not throw an error for a valid email', (validEmail: string) => {
    expect(() => assertValidEmail(validEmail)).not.toThrow();
  });

  test.each([
    'invalid-email',
    'missing@domain',
    '@domain.com',
    'user@.com',
    'user@domain.',
    'user name@domain.com',
    'user@domain..com',
  ])('should throw an error for an invalid email', (invalidEmail: string) => {
    expect(() => assertValidEmail(invalidEmail)).toThrow(ApplicationError);
    expect(() => assertValidEmail(invalidEmail)).toThrow(
      new ApplicationError({
        code: ErrorCode.INVALID_USER_EMAIL,
        params: {
          email: invalidEmail,
        },
      }),
    );
  });
});
