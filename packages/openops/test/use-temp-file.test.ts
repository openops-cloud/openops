const mockWriteFile = jest.fn();
const mockUnlink = jest.fn();
const mockError = jest.fn();

const fsMock = {
  ...jest.requireActual('node:fs/promises'),
  writeFile: mockWriteFile,
  unlink: mockUnlink,
};

jest.mock('node:fs/promises', () => fsMock);
jest.mock('@openops/server-shared', () => ({
  logger: { error: mockError },
}));

import { useTempFile } from '../src/lib/use-temp-file';

describe('useTempFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a temp file with the correct content and invoke the callback', async () => {
    const fileContent = 'test content';
    const callback = jest.fn().mockResolvedValue('callback result');
    mockWriteFile.mockResolvedValue(undefined);

    const result = await useTempFile(fileContent, callback);

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('/tmp/'),
      fileContent,
    );
    expect(callback).toHaveBeenCalledWith(expect.stringContaining('/tmp/'));
    expect(result).toBe('callback result');
    expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining('/tmp/'));
    expect(mockError).not.toHaveBeenCalled();
  });

  it('should remove the temp file even if the callback throws an error', async () => {
    const fileContent = 'test content';
    const callback = jest.fn().mockRejectedValue(new Error('Callback failed'));
    mockWriteFile.mockResolvedValue(undefined);

    await expect(useTempFile(fileContent, callback)).rejects.toThrow(
      'Callback failed',
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('/tmp/'),
      fileContent,
    );
    expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining('/tmp/'));
    expect(mockError).not.toHaveBeenCalled();
  });

  it('should log an error if file deletion fails', async () => {
    const fileContent = 'test content';
    const callback = jest.fn().mockResolvedValue('callback result');
    mockWriteFile.mockResolvedValue(undefined);
    mockUnlink.mockRejectedValue(new Error('Unlink failed'));

    await useTempFile(fileContent, callback);

    expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining('/tmp/'));
    expect(mockError).toHaveBeenCalledWith(
      'Error occurred while removing temporary file',
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });

  it('should handle case where temp file creation fails', async () => {
    const fileContent = 'test content';
    const callback = jest.fn();
    mockWriteFile.mockRejectedValue(new Error('Write failed'));

    await expect(useTempFile(fileContent, callback)).rejects.toThrow(
      'Write failed',
    );

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('/tmp/'),
      fileContent,
    );
    expect(mockUnlink).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();
  });
});
