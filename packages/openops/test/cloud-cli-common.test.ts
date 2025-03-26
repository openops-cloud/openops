const systemMock = {
  getBoolean: jest.fn(),
};

const loggerMock = {
  error: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  SharedSystemProp: {
    OPS_ENABLE_HOST_SESSION: 'OPS_ENABLE_HOST_SESSION',
  },
  system: systemMock,
  logger: loggerMock,
}));

import {
  getUseHostSessionProperty,
  handleCliError,
  tryParseJson,
} from '../src/lib/cloud-cli-common';

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
      `An error occurred while running AWS CLI command: Error: Something went wrong`,
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

describe('useHostSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('useHostSession should have checkbox if OPS_ENABLE_HOST_SESSION=true', async () => {
    systemMock.getBoolean.mockReturnValue(true);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: {},
      propsValue: {},
    };

    const result = await getUseHostSessionProperty(
      'some cloud tool',
      'some login command',
    ).props({}, context);

    expect(result['useHostSessionCheckbox']).toMatchObject({
      displayName: 'Use host machine some cloud tool CLI session',
      type: 'CHECKBOX',
    });
  });

  test('useHostSession should be empty if OPS_ENABLE_HOST_SESSION=false', async () => {
    systemMock.getBoolean.mockReturnValue(false);
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: {},
      propsValue: {},
    };

    const result = (await getUseHostSessionProperty(
      'some cloud tool',
      'some login command',
    ).props({}, context)) as any;

    expect(result).toStrictEqual({});
  });
});
