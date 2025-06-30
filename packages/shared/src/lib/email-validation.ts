import { ApplicationError, ErrorCode } from './common/application-error';

const emailRegex =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const assertValidEmail = (email: string): void => {
  const isEmailValid = emailRegex.test(email);
  if (!isEmailValid) {
    throw new ApplicationError({
      code: ErrorCode.INVALID_USER_EMAIL,
      params: {
        email,
      },
    });
  }
};

export { assertValidEmail, emailRegex };
