import 'jest';

const getDefaultCloudSDKConfigMock = jest
  .fn()
  .mockResolvedValue('/tmp/gcloud-config-abc');
const loginGCPWithKeyObjectMock = jest.fn();
const runCliCommandMock = jest.fn();

jest.mock('@openops/common', () => ({
  getDefaultCloudSDKConfig: getDefaultCloudSDKConfigMock,
  loginGCPWithKeyObject: loginGCPWithKeyObjectMock,
  runCliCommand: runCliCommandMock,
}));

import { runCommand, runCommands } from '../src/lib/google-cloud-cli';

describe('runCommand', () => {
  const auth = { keyFileContent: 'mock-key' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls login, sets project, and runs command, returns only 1 result', async () => {
    loginGCPWithKeyObjectMock.mockResolvedValue('login success');

    runCliCommandMock
      .mockResolvedValueOnce('project set success')
      .mockResolvedValueOnce('command output');

    const result = await runCommand(
      'gcloud compute instances list',
      auth,
      false,
      'my-project',
    );

    expect(result).toBe('command output');

    expect(runCliCommandMock).toHaveBeenCalledTimes(2);
    expect(loginGCPWithKeyObjectMock).toHaveBeenCalledTimes(1);
    expect(getDefaultCloudSDKConfigMock).toHaveBeenCalledTimes(1);

    expect(runCliCommandMock).toHaveBeenNthCalledWith(
      1,
      'gcloud config set project my-project',
      'gcloud',
      expect.objectContaining({
        CLOUDSDK_CONFIG: '/tmp/gcloud-config-abc',
        PATH: expect.any(String),
      }),
    );

    expect(runCliCommandMock).toHaveBeenNthCalledWith(
      2,
      'gcloud compute instances list',
      'gcloud',
      expect.objectContaining({
        CLOUDSDK_CONFIG: '/tmp/gcloud-config-abc',
        PATH: expect.any(String),
      }),
    );
  });
});

describe('Google cloud multiple commands', () => {
  const keyFileContent = 'key file content';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls login, sets project, and runs all command', async () => {
    loginGCPWithKeyObjectMock.mockResolvedValue('login success');

    runCliCommandMock
      .mockResolvedValueOnce('project set success')
      .mockResolvedValueOnce('command 1 output')
      .mockResolvedValueOnce('command 2 output');

    const result = await runCommands(
      ['gcloud compute instances list', 'gcloud version'],
      { keyFileContent },
      false,
      'my-project',
    );

    expect(result).toStrictEqual(['command 1 output', 'command 2 output']);

    expect(runCliCommandMock).toHaveBeenCalledTimes(3);
    expect(loginGCPWithKeyObjectMock).toHaveBeenCalledTimes(1);
    expect(getDefaultCloudSDKConfigMock).toHaveBeenCalledTimes(1);

    expect(runCliCommandMock).toHaveBeenNthCalledWith(
      1,
      'gcloud config set project my-project',
      'gcloud',
      expect.objectContaining({
        CLOUDSDK_CONFIG: '/tmp/gcloud-config-abc',
        PATH: expect.any(String),
      }),
    );

    expect(runCliCommandMock).toHaveBeenNthCalledWith(
      2,
      'gcloud compute instances list',
      'gcloud',
      expect.objectContaining({
        CLOUDSDK_CONFIG: '/tmp/gcloud-config-abc',
        PATH: expect.any(String),
      }),
    );

    expect(runCliCommandMock).toHaveBeenNthCalledWith(
      3,
      'gcloud version',
      'gcloud',
      expect.objectContaining({
        CLOUDSDK_CONFIG: '/tmp/gcloud-config-abc',
        PATH: expect.any(String),
      }),
    );
  });

  test('skips temp config if shouldUseHostCredentials is true', async () => {
    runCliCommandMock.mockResolvedValueOnce('command output');

    const result = await runCommands(
      ['gcloud info'],
      { keyFileContent },
      true,
      undefined,
    );

    expect(result).toStrictEqual(['command output']);
    expect(loginGCPWithKeyObjectMock).not.toHaveBeenCalled();

    expect(runCliCommandMock).toHaveBeenCalledWith(
      'gcloud info',
      'gcloud',
      expect.objectContaining({
        PATH: expect.any(String),
      }),
    );
  });

  test('throws if runCommands throws', async () => {
    runCliCommandMock.mockRejectedValue(new Error('something broke'));

    await expect(runCommand('gcloud info', auth, true)).rejects.toThrow(
      'something broke',
    );
  });
});

describe('Google cloud runCommands', () => {
  const keyFileContent = 'key file content';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls login, sets project, and runs all commands', async () => {
    loginGCPWithKeyObjectMock.mockResolvedValue(undefined);

    runCliCommandMock
      .mockResolvedValueOnce('project set success')
      .mockResolvedValueOnce('result-1')
      .mockResolvedValueOnce('result-2');

    const results = await runCommands(
      ['cmd-1', 'cmd-2'],
      { keyFileContent },
      false,
      'my-project',
    );

    expect(results).toEqual(['result-1', 'result-2']);

    expect(getDefaultCloudSDKConfigMock).toHaveBeenCalled();
    expect(loginGCPWithKeyObjectMock).toHaveBeenCalledWith(
      keyFileContent,
      expect.objectContaining({
        CLOUDSDK_CONFIG: '/tmp/gcloud-config-abc',
      }),
    );

    expect(runCliCommandMock).toHaveBeenNthCalledWith(
      1,
      'gcloud config set project my-project',
      'gcloud',
      expect.any(Object),
    );

    expect(runCliCommandMock).toHaveBeenNthCalledWith(
      2,
      'cmd-1',
      'gcloud',
      expect.any(Object),
    );

    expect(runCliCommandMock).toHaveBeenNthCalledWith(
      3,
      'cmd-2',
      'gcloud',
      expect.any(Object),
    );
  });

  test('skips login and config dir if using host credentials', async () => {
    runCliCommandMock
      .mockResolvedValueOnce('res1')
      .mockResolvedValueOnce('res2');

    const result = await runCommands(
      ['cmd-a', 'cmd-b'],
      { keyFileContent },
      true,
    );

    expect(result).toEqual(['res1', 'res2']);
    expect(getDefaultCloudSDKConfigMock).not.toHaveBeenCalled();
    expect(loginGCPWithKeyObjectMock).not.toHaveBeenCalled();

    expect(runCliCommandMock).toHaveBeenCalledWith(
      'cmd-a',
      'gcloud',
      expect.any(Object),
    );

    expect(runCliCommandMock).toHaveBeenCalledWith(
      'cmd-b',
      'gcloud',
      expect.any(Object),
    );
  });

  test('uses CLOUDSDK_CONFIG from process.env if set', async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      CLOUDSDK_CONFIG: '/env/config',
    };

    runCliCommandMock.mockResolvedValueOnce('res');

    const result = await runCommands(['gcloud info'], { keyFileContent }, true);

    expect(result).toStrictEqual(['command output']);
    expect(runCliCommandMock).toHaveBeenCalledWith(
      'gcloud info',
      'gcloud',
      expect.objectContaining({
        CLOUDSDK_CONFIG: '/env/config',
      }),
    );

    process.env = originalEnv;
  });

  test('throws if any command fails', async () => {
    runCliCommandMock
      .mockResolvedValueOnce('ok')
      .mockRejectedValueOnce(new Error('failure'));

    await expect(
      runCommands(['cmd1', 'cmd2'], { keyFileContent }, true),
    ).rejects.toThrow('failure');
  });
});
