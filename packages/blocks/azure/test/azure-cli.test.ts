const commonMock = {
  runCliCommand: jest.fn(),
};

jest.mock('@openops/common', () => commonMock);

import { runCommand } from '../src/lib/azure-cli';

const credentials = {
  clientId: 'some client id',
  clientSecret: 'some secret',
  tenantId: 'some tenant id',
};

describe('azureCli', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call runCliCommand with the given arguments', async () => {
    commonMock.runCliCommand.mockResolvedValueOnce('login result');
    commonMock.runCliCommand.mockResolvedValueOnce('mock result');

    const result = await runCommand('some command', credentials, false);

    expect(result).toBe('mock result');
    expect(commonMock.runCliCommand).toHaveBeenCalledTimes(2);
    expect(commonMock.runCliCommand).toHaveBeenCalledWith(
      `login --service-principal --username ${credentials.clientId} --password ${credentials.clientSecret} --tenant ${credentials.tenantId}`,
      'az',
      {
        PATH: process.env['PATH'],
        AZURE_CONFIG_DIR: expect.any(String),
      },
    );
    expect(commonMock.runCliCommand).toHaveBeenCalledWith(
      'some command',
      'az',
      {
        PATH: process.env['PATH'],
        AZURE_CONFIG_DIR: expect.any(String),
      },
    );
  });

  test('should call set subscription if provided', async () => {
    commonMock.runCliCommand.mockResolvedValueOnce('login result');
    commonMock.runCliCommand.mockResolvedValueOnce('set subscription result');
    commonMock.runCliCommand.mockResolvedValueOnce('mock result');

    const result = await runCommand(
      'some command',
      credentials,
      false,
      'subscriptionId',
    );

    expect(result).toBe('mock result');
    expect(commonMock.runCliCommand).toHaveBeenCalledTimes(3);
    expect(commonMock.runCliCommand).toHaveBeenNthCalledWith(
      1,
      `login --service-principal --username ${credentials.clientId} --password ${credentials.clientSecret} --tenant ${credentials.tenantId}`,
      'az',
      {
        PATH: process.env['PATH'],
        AZURE_CONFIG_DIR: expect.any(String),
      },
    );
    expect(commonMock.runCliCommand).toHaveBeenNthCalledWith(
      2,
      'account set --subscription subscriptionId',
      'az',
      {
        PATH: process.env['PATH'],
        AZURE_CONFIG_DIR: expect.any(String),
      },
    );
    expect(commonMock.runCliCommand).toHaveBeenNthCalledWith(
      3,
      'some command',
      'az',
      {
        PATH: process.env['PATH'],
        AZURE_CONFIG_DIR: expect.any(String),
      },
    );
  });

  test('should call set subscription if provided and useHostLogin is true', async () => {
    commonMock.runCliCommand.mockResolvedValueOnce('set subscription result');
    commonMock.runCliCommand.mockResolvedValueOnce('mock result');

    const result = await runCommand(
      'some command',
      credentials,
      true,
      'subscriptionId',
    );

    expect(result).toBe('mock result');
    expect(commonMock.runCliCommand).toHaveBeenCalledTimes(2);
    expect(commonMock.runCliCommand).toHaveBeenNthCalledWith(
      1,
      'account set --subscription subscriptionId',
      'az',
      {
        PATH: process.env['PATH'],
      },
    );
    expect(commonMock.runCliCommand).toHaveBeenNthCalledWith(
      2,
      'some command',
      'az',
      {
        PATH: process.env['PATH'],
      },
    );
  });

  test('should set the path and skip the login if useHostSession is true', async () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv, PATH: '/mock/path' };

    commonMock.runCliCommand.mockResolvedValue('mock result');

    const result = await runCommand('some command', credentials, true);

    expect(result).toBe('mock result');
    expect(commonMock.runCliCommand).toHaveBeenCalledTimes(1);
    expect(commonMock.runCliCommand).toHaveBeenCalledWith(
      'some command',
      'az',
      {
        PATH: process.env['PATH'],
      },
    );
    process.env = originalEnv;
  });

  test('should set the path and config dir and skip the login if useHostSession is true', async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      PATH: '/mock/path',
      AZURE_CONFIG_DIR: '/mock/config/dir',
    };

    commonMock.runCliCommand.mockResolvedValue('mock result');

    const result = await runCommand('some command', credentials, true);

    expect(result).toBe('mock result');
    expect(commonMock.runCliCommand).toHaveBeenCalledTimes(1);
    expect(commonMock.runCliCommand).toHaveBeenCalledWith(
      'some command',
      'az',
      {
        PATH: process.env['PATH'],
        AZURE_CONFIG_DIR: process.env['AZURE_CONFIG_DIR'],
      },
    );
    process.env = originalEnv;
  });
});
