const mockSystem = { getBoolean: jest.fn().mockReturnValue(false) };
jest.mock('@openops/server-shared', () => ({
  system: mockSystem,
  SharedSystemProp: {
    AWS_ENABLE_IMPLICIT_ROLE: 'AWS_ENABLE_IMPLICIT_ROLE',
  },
}));
import { awsCliAction } from '../../src/lib/actions/cli/aws-cli-action';

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
});
