const loggerMock = {
  error: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  logger: loggerMock,
}));

import { handleCliError, tryParseJson } from '../src/lib/cloud-cli-common';

describe('tryParseJson', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns parsed JSON when input is valid JSON', () => {
    const input = '{"someKey":"some value"}';
    const result = tryParseJson(input);
    expect(result).toEqual({ someKey: 'some value' });
  });

  test('returns original string when input is not valid JSON', () => {
    const input = 'not a json string';
    const result = tryParseJson(input);
    expect(result).toBe(input);
  });
});

describe('handleCliError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('logs the error and throws with correct message', () => {
    const error = new Error('Something went wrong');
    const command = 'aws s3 ls';
    const provider = 'AWS';

    expect(() => {
      handleCliError({ provider, command, error });
    }).toThrowError(
      `An error occurred while running a AWS CLI command: Error: Something went wrong`,
    );

    expect(loggerMock.error).toHaveBeenCalledWith(
      'AWS CLI execution failed.',
      expect.objectContaining({
        command,
        error,
      }),
    );
  });
});
