import { logger } from '@openops/server-shared';
import {
  convertMultilineToSingleLine,
  runCliCommand,
} from '../../openops/src/lib/cli-command-wrapper';
import { executeFile } from '../src/lib/command-wrapper';

jest.mock('../src/lib/command-wrapper', () => ({
  executeFile: jest.fn(),
}));

jest.mock('@openops/server-shared', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('runCliCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return output on success', async () => {
    (executeFile as jest.Mock).mockResolvedValue({
      stdOut: 'output data',
      stdError: '',
      exitCode: 0,
    });

    const result = await runCliCommand(
      'cliTool someParam anotherParam',
      'cliTool',
      {
        someProperty: 'value1',
      },
    );

    expect(result).toEqual('output data');
  });

  it('should throw an error when exit code is defined', async () => {
    (executeFile as jest.Mock).mockResolvedValue({
      stdOut: '',
      stdError: 'error data',
      exitCode: 1,
    });

    await expect(
      runCliCommand('cliTool someParam anotherParam', 'cliTool', undefined),
    ).rejects.toThrow(
      'Failed to run the cliTool command: \'cliTool someParam anotherParam\'. Error: {"stdOut":"","stdError":"error data","exitCode":1}',
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to run the cliTool command.',
      { stdOut: '', stdError: 'error data', exitCode: 1 },
    );
  });

  it('should not throw an error when stdError is defined', async () => {
    (executeFile as jest.Mock).mockResolvedValue({
      stdOut: 'some output',
      stdError: 'error occurred',
      exitCode: 0,
    });

    const result = await runCliCommand(
      'cliTool someParam anotherParam',
      'cliTool',
      {
        someProperty: 'value1',
      },
    );

    expect(result).toEqual('some output');
  });
});

describe('convertMultilineToSingleLine', () => {
  it('should remove line continuation characters and join lines correctly', () => {
    const input = `cliTool someParam \\
    anotherParam`;
    const expectedOutput = 'cliTool someParam anotherParam';
    expect(convertMultilineToSingleLine(input)).toBe(expectedOutput);
  });

  it('should remove multiple spaces and newlines', () => {
    const input = `   cliTool   someParam
    anotherParam  `;
    const expectedOutput = 'cliTool someParam anotherParam';
    expect(convertMultilineToSingleLine(input)).toBe(expectedOutput);
  });

  it('should keep spacing between quoted arguments intact', () => {
    const input = `cliTool "some quoted  param" anotherParam`;
    const expectedOutput = 'cliTool "some quoted  param" anotherParam';
    expect(convertMultilineToSingleLine(input)).toBe(expectedOutput);
  });

  it('should keep new lines in quoted arguments intact', () => {
    const input = `cliTool "some quoted
                  param" \
                  anotherParam`;
    const expectedOutput = `cliTool "some quoted
                  param" anotherParam`;
    expect(convertMultilineToSingleLine(input)).toBe(expectedOutput);
  });

  it('should handle an already clean command correctly', () => {
    const input = `cliTool someParam anotherParam`;
    const expectedOutput = 'cliTool someParam anotherParam';
    expect(convertMultilineToSingleLine(input)).toBe(expectedOutput);
  });

  it('should handle complex multi-line commands with proper spacing', () => {
    const input = `cliTool --option1 value1 \\
                   --option2 "value with spaces" \\
                   --option3=value3`;
    const expectedOutput =
      'cliTool --option1 value1 --option2 "value with spaces" --option3=value3';
    expect(convertMultilineToSingleLine(input)).toBe(expectedOutput);
  });

  it('should trim leading and trailing whitespace', () => {
    const input = `  cliTool someParam anotherParam  `;
    const expectedOutput = 'cliTool someParam anotherParam';
    expect(convertMultilineToSingleLine(input)).toBe(expectedOutput);
  });

  it('should preserve backslashes in Windows paths', () => {
    const input = `mytool --path "C:\\Users\\Leyla\\Documents"`;
    expect(convertMultilineToSingleLine(input)).toBe(
      `mytool --path "C:\\Users\\Leyla\\Documents"`,
    );
  });

  it('should preserve double backslashes in JSON queries', () => {
    const input = `az vm list --query "[?name=='MyVM' && tags.Project == 'DevOps\\\\Infra']"`;
    expect(convertMultilineToSingleLine(input)).toBe(
      `az vm list --query "[?name=='MyVM' && tags.Project == 'DevOps\\\\Infra']"`,
    );
  });

  it('should preserve regex backslashes', () => {
    const input = `grep "error\\|warn" logs.txt`;
    expect(convertMultilineToSingleLine(input)).toBe(
      `grep "error\\|warn" logs.txt`,
    );
  });

  it('should remove line continuation backslashes', () => {
    const input = `cliTool someParam \\
    anotherParam`;
    expect(convertMultilineToSingleLine(input)).toBe(
      `cliTool someParam anotherParam`,
    );
  });
});
