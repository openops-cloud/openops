const mockSystem = {
  getBoolean: jest.fn().mockReturnValue(false),
  get: jest.fn().mockReturnValue(undefined),
};
jest.mock('@openops/server-shared', () => ({
  system: mockSystem,
  SharedSystemProp: {
    AWS_ENABLE_IMPLICIT_ROLE: 'AWS_ENABLE_IMPLICIT_ROLE',
    AWS_WEB_IDENTITY_TOKEN_FILE: 'AWS_WEB_IDENTITY_TOKEN_FILE',
    AWS_FEDERATION_ROLE_ARN: 'AWS_FEDERATION_ROLE_ARN',
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

describe('awsCli', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  test('should pass web identity variables when implicit role is enabled', async () => {
    mockSystem.getBoolean.mockReturnValue(true);
    mockSystem.get.mockImplementation((prop: string) => {
      if (prop === 'AWS_WEB_IDENTITY_TOKEN_FILE') {
        return '/var/run/secrets/aws/token';
      }
      if (prop === 'AWS_FEDERATION_ROLE_ARN') {
        return 'arn:aws:iam::123456789012:role/OpenOps-AssumeRole-Dev';
      }
      return undefined;
    });
    openOpsMock.runCliCommand.mockResolvedValue('mock result');

    try {
      await runCommand('some command', 'region', {});

      expect(openOpsMock.runCliCommand).toHaveBeenCalledWith(
        'some command',
        'aws',
        {
          AWS_DEFAULT_REGION: 'region',
          PATH: process.env['PATH'],
          AWS_WEB_IDENTITY_TOKEN_FILE: '/var/run/secrets/aws/token',
          AWS_ROLE_ARN: 'arn:aws:iam::123456789012:role/OpenOps-AssumeRole-Dev',
        },
      );
    } finally {
      mockSystem.getBoolean.mockReturnValue(false);
      mockSystem.get.mockReturnValue(undefined);
    }
  });

  test('should omit web identity variables when only one of them is set', async () => {
    mockSystem.getBoolean.mockReturnValue(true);
    mockSystem.get.mockImplementation((prop: string) =>
      prop === 'AWS_WEB_IDENTITY_TOKEN_FILE'
        ? '/var/run/secrets/aws/token'
        : undefined,
    );
    openOpsMock.runCliCommand.mockResolvedValue('mock result');

    try {
      await runCommand('some command', 'region', {});

      const envVars = openOpsMock.runCliCommand.mock.calls[0][2];
      expect(envVars.AWS_WEB_IDENTITY_TOKEN_FILE).toBeUndefined();
      expect(envVars.AWS_ROLE_ARN).toBeUndefined();
    } finally {
      mockSystem.getBoolean.mockReturnValue(false);
      mockSystem.get.mockReturnValue(undefined);
    }
  });
});
