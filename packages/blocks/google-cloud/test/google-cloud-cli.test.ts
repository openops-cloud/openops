const runCliCommandMock = jest.fn();
jest.mock('@openops/common', () => ({
  runCliCommand: runCliCommandMock,
}));

const fsPromisesMock = {
  ...jest.requireActual('fs/promises'),
  mkdtemp: jest.fn(),
  writeFile: jest.fn(),
};
jest.mock('fs/promises', () => fsPromisesMock);

import { runCommand } from '../src/lib/google-cloud-cli';

describe('Google cloud runCommand', () => {
  const keyFileContent = 'key file content';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls login, sets project, and runs command', async () => {
    fsPromisesMock.mkdtemp.mockResolvedValue('/tmp/gcloud-config-abc');

    runCliCommandMock
      .mockResolvedValueOnce('login success')
      .mockResolvedValueOnce('project set success')
      .mockResolvedValueOnce('command output');

    const result = await runCommand(
      'gcloud compute instances list',
      { keyFileContent },
      false,
      'my-project',
    );

    expect(result).toBe('command output');

    expect(fsPromisesMock.mkdtemp).toHaveBeenCalledWith(
      expect.stringMatching(/^\/tmp\/gcloud-config/),
    );
    expect(fsPromisesMock.writeFile).toHaveBeenCalledWith(
      '/tmp/gcp-key.json',
      keyFileContent,
    );

    expect(runCliCommandMock).toHaveBeenNthCalledWith(
      1,
      'gcloud auth activate-service-account --key-file=/tmp/gcp-key.json --quiet',
      'gcloud',
      expect.objectContaining({
        CLOUDSDK_CONFIG: '/tmp/gcloud-config-abc',
        PATH: expect.any(String),
      }),
    );

    expect(runCliCommandMock).toHaveBeenNthCalledWith(
      2,
      'gcloud config set project my-project --quiet',
      'gcloud',
      expect.objectContaining({
        CLOUDSDK_CONFIG: '/tmp/gcloud-config-abc',
        PATH: expect.any(String),
      }),
    );

    expect(runCliCommandMock).toHaveBeenNthCalledWith(
      3,
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
    expect(fsPromisesMock.mkdtemp).not.toHaveBeenCalled();
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
