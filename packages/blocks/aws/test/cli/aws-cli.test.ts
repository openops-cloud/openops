const mockSystem = { getBoolean: jest.fn().mockReturnValue(false) };
jest.mock('@openops/server-shared', () => ({
  system: mockSystem,
  SharedSystemProp: {
    AWS_ENABLE_IMPLICIT_ROLE: 'AWS_ENABLE_IMPLICIT_ROLE',
  },
}));

const openOpsMock = {
  runCliCommand: jest.fn(),
};

jest.mock('@openops/common', () => openOpsMock);

import { runCommand } from '../../src/lib/actions/cli/aws-cli';

const credential = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  sessionToken: 'some token',
};

const AMBIENT_CREDENTIAL_ENV_VARS = [
  'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI',
  'AWS_CONTAINER_CREDENTIALS_FULL_URI',
  'AWS_CONTAINER_AUTHORIZATION_TOKEN',
  'AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE',
  'AWS_ROLE_ARN',
  'AWS_ROLE_SESSION_NAME',
  'AWS_WEB_IDENTITY_TOKEN_FILE',
];

describe('awsCli', () => {
  // The machine running the tests may itself have some of these set, which
  // would leak into the assertions below.
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    jest.clearAllMocks();

    for (const name of AMBIENT_CREDENTIAL_ENV_VARS) {
      originalEnv[name] = process.env[name];
      delete process.env[name];
    }
  });

  afterEach(() => {
    for (const name of AMBIENT_CREDENTIAL_ENV_VARS) {
      if (originalEnv[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = originalEnv[name];
      }
    }
  });

  test('should call runCliCommand with the given arguments', async () => {
    openOpsMock.runCliCommand.mockResolvedValue('mock result');

    const result = await runCommand('some command', 'region', credential);

    expect(result).toBe('mock result');
    expect(openOpsMock.runCliCommand).toHaveBeenCalledWith(
      'some command',
      'aws',
      {
        AWS_ACCESS_KEY_ID: credential.accessKeyId,
        AWS_SECRET_ACCESS_KEY: credential.secretAccessKey,
        AWS_SESSION_TOKEN: credential.sessionToken,
        AWS_DEFAULT_REGION: 'region',
        PATH: process.env['PATH'],
      },
    );
  });

  test('should throw if credentials are not provided', async () => {
    await expect(runCommand('some command', 'region', {})).rejects.toThrow(
      'AWS credentials are required, please provide accessKeyId and secretAccessKey',
    );
  });

  test('should not throw if credentials are not provided but implicit role is enabled', async () => {
    mockSystem.getBoolean.mockReturnValue(true);

    try {
      const result = await runCommand('some command', 'region', {});

      expect(result).toBeDefined();
      expect(openOpsMock.runCliCommand).toHaveBeenCalledWith(
        'some command',
        'aws',
        {
          AWS_DEFAULT_REGION: 'region',
          AWS_ACCESS_KEY_ID: undefined,
          AWS_SECRET_ACCESS_KEY: undefined,
          AWS_SESSION_TOKEN: undefined,
          PATH: process.env['PATH'],
        },
      );
    } finally {
      mockSystem.getBoolean.mockReturnValue(false);
    }
  });

  test('should forward ambient credential variables when implicit role is enabled', async () => {
    mockSystem.getBoolean.mockReturnValue(true);
    process.env['AWS_CONTAINER_CREDENTIALS_RELATIVE_URI'] =
      '/v2/credentials/abc';
    process.env['AWS_WEB_IDENTITY_TOKEN_FILE'] = '/var/run/secrets/token';

    try {
      await runCommand('some command', 'region', {});

      expect(openOpsMock.runCliCommand).toHaveBeenCalledWith(
        'some command',
        'aws',
        {
          AWS_DEFAULT_REGION: 'region',
          PATH: process.env['PATH'],
          AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: '/v2/credentials/abc',
          AWS_WEB_IDENTITY_TOKEN_FILE: '/var/run/secrets/token',
        },
      );
    } finally {
      mockSystem.getBoolean.mockReturnValue(false);
    }
  });

  test('should not forward ambient credential variables when explicit credentials are given', async () => {
    process.env['AWS_CONTAINER_CREDENTIALS_RELATIVE_URI'] =
      '/v2/credentials/abc';

    await runCommand('some command', 'region', credential);

    expect(openOpsMock.runCliCommand).toHaveBeenCalledWith(
      'some command',
      'aws',
      {
        AWS_ACCESS_KEY_ID: credential.accessKeyId,
        AWS_SECRET_ACCESS_KEY: credential.secretAccessKey,
        AWS_SESSION_TOKEN: credential.sessionToken,
        AWS_DEFAULT_REGION: 'region',
        PATH: process.env['PATH'],
      },
    );
  });
});
