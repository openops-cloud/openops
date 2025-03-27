const runCliCommandMock = jest.fn();
const useTempFileMock = jest.fn();

jest.mock('../../src/lib/cli-command-wrapper', () => ({
  runCliCommand: runCliCommandMock,
}));

jest.mock('../../src/lib/use-temp-file', () => ({
  useTempFile: useTempFileMock,
}));

const fsPromisesMock = {
  ...jest.requireActual('fs/promises'),
  mkdtemp: jest.fn(),
};
jest.mock('fs/promises', () => fsPromisesMock);

import { loginGCPWithKeyObject } from '../../src/lib/google-cloud/auth';

describe('Google cloud login with key', () => {
  const keyFileContent = 'key file content';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call the login command with a temporary file', async () => {
    fsPromisesMock.mkdtemp.mockResolvedValue('/tmp/gcloud-config-abc');
    useTempFileMock.mockImplementation(async (_contents, callback) => {
      return callback('/tmp/mock-key-file.json');
    });

    runCliCommandMock.mockResolvedValueOnce('login success');
    const envVar = {
      PATH: 'path/to/env',
    };
    const result = await loginGCPWithKeyObject(keyFileContent, envVar);

    expect(result).toBe('login success');

    expect(useTempFileMock).toHaveBeenCalledWith(
      keyFileContent,
      expect.any(Function),
    );
    expect(runCliCommandMock).toHaveBeenCalledTimes(1);
    expect(runCliCommandMock).toHaveBeenCalledWith(
      'gcloud auth activate-service-account --key-file=/tmp/mock-key-file.json',
      'gcloud',
      expect.objectContaining({
        ...envVar,
      }),
    );
  });
});
