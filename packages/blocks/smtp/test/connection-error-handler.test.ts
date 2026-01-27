import { connectionErrorHandler } from '../src/lib/connection-error-handler';

describe('connectionErrorHandler', () => {
  test('should return correct error message for EDNS error code', () => {
    const error = { code: 'EDNS' };
    const result = connectionErrorHandler(error);
    expect(result).toEqual({
      valid: false,
      error: 'SMTP server not found or unreachable. Error Code: EDNS',
    });
  });

  test('should return correct error message for CONN error code', () => {
    const error = { code: 'CONN' };
    const result = connectionErrorHandler(error);
    expect(result).toEqual({
      valid: false,
      error:
        'Could not establish a connection to the SMTP server. Error Code: CONN',
    });
  });

  test('should return correct error message for ETIMEDOUT error code', () => {
    const error = { code: 'ETIMEDOUT' };
    const result = connectionErrorHandler(error);
    expect(result).toEqual({
      valid: false,
      error: 'Connection to the SMTP server timed out. Error Code: ETIMEDOUT',
    });
  });

  test('should return stringified error for error code not defined', () => {
    const error = { code: undefined };
    const result = connectionErrorHandler(error);
    expect(result).toEqual({
      valid: false,
      error: JSON.stringify(error),
    });
  });

  test('should return default message with unknown error code', () => {
    const error = { code: 'UNKNOWN_CODE' };
    const result = connectionErrorHandler(error);
    expect(result).toEqual({
      valid: false,
      error: `SMTP connection failed with error code: UNKNOWN_CODE`,
    });
  });

  test('should return stringified error when error object has no code', () => {
    const error = { message: 'Some error' };
    const result = connectionErrorHandler(error);
    expect(result).toEqual({
      valid: false,
      error: JSON.stringify(error),
    });
  });

  test('should return stringified error for non-object errors', () => {
    const error = 'some string error';
    const result = connectionErrorHandler(error);
    expect(result).toEqual({
      valid: false,
      error: JSON.stringify(error),
    });
  });

  test('should return stringified null for null error', () => {
    const error = null;
    const result = connectionErrorHandler(error);
    expect(result).toEqual({
      valid: false,
      error: JSON.stringify(error),
    });
  });
});
