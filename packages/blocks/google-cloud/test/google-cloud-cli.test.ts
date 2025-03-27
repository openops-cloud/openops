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

import { runCommand } from '../src/lib/google-cloud-cli';

describe('Google cloud runCommand', () => {
  const keyFileContent = 'key file content';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls login, sets project, and runs command', async () => {
    loginGCPWithKeyObjectMock.mockResolvedValue('login success');

    runCliCommandMock
      .mockResolvedValueOnce('project set success')
      .mockResolvedValueOnce('command output');

    const result = await runCommand(
      'gcloud compute instances list',
      { keyFileContent },
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

  test('skips temp config if shouldUseHostCredentials is true', async () => {
    runCliCommandMock.mockResolvedValueOnce('command output');

    const result = await runCommand(
      'gcloud info',
      { keyFileContent },
      true,
      undefined,
    );

    expect(result).toBe('command output');
    expect(loginGCPWithKeyObjectMock).not.toHaveBeenCalled();

    expect(runCliCommandMock).toHaveBeenCalledWith(
      'gcloud info',
      'gcloud',
      expect.objectContaining({
        PATH: expect.any(String),
      }),
    );
  });

  test('sets CLOUDSDK_CONFIG if defined', async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      PATH: '/mock/path',
      CLOUDSDK_CONFIG: '/mock/config/dir',
    };

    runCliCommandMock.mockResolvedValueOnce('command output');

    const result = await runCommand('gcloud info', { keyFileContent }, true);

    expect(result).toBe('command output');
    expect(runCliCommandMock).toHaveBeenCalledWith(
      expect.any(String),
      'gcloud',
      expect.objectContaining({
        CLOUDSDK_CONFIG: '/mock/config/dir',
      }),
    );

    process.env = originalEnv;
  });

  test('throws error when runCliCommand fails', async () => {
    runCliCommandMock.mockRejectedValueOnce(new Error('auth failed'));

    await expect(
      runCommand('gcloud info', { keyFileContent }, true, undefined),
    ).rejects.toThrow('auth failed');
  });
});
