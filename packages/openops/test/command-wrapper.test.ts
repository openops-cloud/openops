import { Readable } from 'stream';

const mockGetNumber = jest.fn();
jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  system: {
    getNumber: mockGetNumber,
  },
}));

const mockSpawn = jest.fn();
const mockExecFile = jest.fn();
jest.mock('node:child_process', () => {
  return {
    spawn: mockSpawn,
    execFile: mockExecFile,
  };
});

import { executeCommand, executeFile } from '../src/lib/command-wrapper';

describe('Execute Command', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should execute command and return exit code 0 and stdout data', async () => {
    mockMockSpawn('stdout data', '', 0);

    const result = await executeCommand('command', [
      'parameter 1',
      'parameter 2',
    ]);

    expect(result).toEqual({
      stdOut: 'stdout data',
      stdError: '',
      exitCode: 0,
    });

    expect(mockSpawn).toHaveBeenCalledWith('command', [
      'parameter 1',
      'parameter 2',
    ]);
  });

  it('should execute command and return exit code 1 and stderr data', async () => {
    mockMockSpawn('', 'stderr data', 1);

    const result = await executeCommand('command', [
      'parameter 1',
      'parameter 2',
    ]);

    expect(result).toEqual({
      stdOut: '',
      stdError: 'stderr data',
      exitCode: 1,
    });

    expect(mockSpawn).toHaveBeenCalledWith('command', [
      'parameter 1',
      'parameter 2',
    ]);
  });

  test.each([
    ['stdout data\n', '\nstderr\ndata\n'],
    ['\nstdout data\n\n', '\nstderr\ndata\n'],
    ['stdout data\r\n\r\n', '\r\nstderr\ndata'],
    ['\r\nstdout data\r\n\r\n', '\r\nstderr\ndata\r\n'],
  ])(
    'should execute command and return trimmed data',
    async (stdOutData: string, stdErrData: string) => {
      mockMockSpawn(stdOutData, stdErrData, 1);

      const result = await executeCommand('command', [
        'parameter 1',
        'parameter 2',
      ]);

      expect(result).toEqual({
        stdOut: 'stdout data',
        stdError: 'stderr\ndata',
        exitCode: 1,
      });

      expect(mockSpawn).toHaveBeenCalledWith('command', [
        'parameter 1',
        'parameter 2',
      ]);
    },
  );
});

describe('Execute File', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should execute command with env variables and return exit code 0 and stdout data', async () => {
    mockMockExecFile('stdout data', '', 0);

    const result = await executeFile(
      'command',
      ['parameter 1', 'parameter 2'],
      { VAR1: 'var1' },
    );

    expect(result).toEqual({
      stdOut: 'stdout data',
      stdError: '',
      exitCode: 0,
    });

    expect(mockExecFile).toHaveBeenCalledWith(
      'command',
      ['parameter 1', 'parameter 2'],
      { env: { VAR1: 'var1' } },
    );
  });

  it('should execute command with env variables and return exit code 1 and stderr data', async () => {
    mockMockExecFile('', 'stderr data', 1);

    const result = await executeFile(
      'command',
      ['parameter 1', 'parameter 2'],
      { VAR1: 'var1' },
    );

    expect(result).toEqual({
      stdOut: '',
      stdError: 'stderr data',
      exitCode: 1,
    });

    expect(mockExecFile).toHaveBeenCalledWith(
      'command',
      ['parameter 1', 'parameter 2'],
      { env: { VAR1: 'var1' } },
    );
  });

  test.each([
    ['stdout data\n', '\nstderr\ndata\n'],
    ['\nstdout data\n\n', '\nstderr\ndata\n'],
    ['stdout data\r\n\r\n', '\r\nstderr\ndata'],
    ['\r\nstdout data\r\n\r\n', '\r\nstderr\ndata\r\n'],
  ])(
    'should execute command with env variables and return trimmed data',
    async (stdOutData: string, stdErrData: string) => {
      mockMockExecFile(stdOutData, stdErrData, 1);

      const result = await executeFile(
        'command',
        ['parameter 1', 'parameter 2'],
        { VAR1: 'var1' },
      );

      expect(result).toEqual({
        stdOut: 'stdout data',
        stdError: 'stderr\ndata',
        exitCode: 1,
      });

      expect(mockExecFile).toHaveBeenCalledWith(
        'command',
        ['parameter 1', 'parameter 2'],
        { env: { VAR1: 'var1' } },
      );
    },
  );

  it('should set maxBuffer when EXEC_FILE_MAX_BUFFER_SIZE_MB is defined', async () => {
    mockGetNumber.mockReturnValue(5); // 5 MB
    mockMockExecFile('ok', '', 0);

    await executeFile('command', ['--arg'], { VAR: 'value' });

    expect(mockExecFile).toHaveBeenCalledWith(
      'command',
      ['--arg'],
      expect.objectContaining({
        env: { VAR: 'value' },
        maxBuffer: 5 * 1024 * 1024,
      }),
    );
  });

  it('should not set maxBuffer when EXEC_FILE_MAX_BUFFER_SIZE_MB is undefined', async () => {
    mockGetNumber.mockReturnValue(undefined);
    mockMockExecFile('ok', '', 0);

    await executeFile('command', ['--arg'], { VAR: 'value' });

    expect(mockExecFile).toHaveBeenCalledWith(
      'command',
      ['--arg'],
      expect.not.objectContaining({ maxBuffer: expect.any(Number) }),
    );
  });
});

function mockReadableStream(data: string) {
  return new Readable({
    read() {
      this.push(data);
      this.push(null);
    },
  });
}

function mockMockExecFile(
  stdoutData: string,
  stderrData: string,
  exitCode: number,
) {
  const stdOutMock = mockReadableStream(stdoutData);
  const stdErrMock = mockReadableStream(stderrData);
  mockExecFile.mockImplementation(() => ({
    stdout: stdOutMock,
    stderr: stdErrMock,
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        stdOutMock.on('end', () => {
          callback(exitCode);
        });
      }
    }),
  }));
}

function mockMockSpawn(
  stdoutData: string,
  stderrData: string,
  exitCode: number,
) {
  const stdOutMock = mockReadableStream(stdoutData);
  const stdErrMock = mockReadableStream(stderrData);
  mockSpawn.mockImplementation(() => ({
    stdout: stdOutMock,
    stderr: stdErrMock,
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        stdOutMock.on('end', () => {
          callback(exitCode);
        });
      }
    }),
  }));
}
