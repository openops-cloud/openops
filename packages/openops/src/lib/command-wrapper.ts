import { AppSystemProp, logger, system } from '@openops/server-shared';
import { ChildProcess } from 'child_process';
import { execFile, ExecFileOptions, spawn } from 'node:child_process';

export interface CommandResult {
  stdOut: string;
  stdError: string;
  exitCode: number;
}

export async function executeCommand(
  command: string,
  args: string[],
): Promise<CommandResult> {
  const fullCommand = `${command} ${args.join(' ')}`;
  logger.debug('Execute command', { command: fullCommand });

  const env: NodeJS.ProcessEnv = {};
  if (process.env['HOME']) {
    env['HOME'] = process.env['HOME'];
  }

  const childProcess = spawn(command, args);

  return await getResult(childProcess, fullCommand);
}

export async function executeFile(
  file: string,
  args: string[],
  envVariables: any,
): Promise<CommandResult> {
  if (!envVariables['HOME'] && process.env['HOME']) {
    envVariables.HOME = process.env['HOME'];
  }

  const options: ExecFileOptions = {
    env: envVariables,
  };

  const maxBuffer = system.getNumber(
    AppSystemProp.EXEC_FILE_MAX_BUFFER_SIZE_MB,
  );
  if (maxBuffer) {
    options.maxBuffer = maxBuffer * 1024 * 1024;
  }

  const childProcess = execFile(file, args, options);
  return await getResult(childProcess, file);
}

async function getResult(childProcess: ChildProcess, fullCommand: string) {
  let stdout = '';
  let errorMessage = '';

  childProcess.stderr?.on('data', function (data) {
    errorMessage += data;
  });

  childProcess.stdout?.on('data', (data) => {
    stdout += data;
  });

  const result = await new Promise<{
    exitCode: number;
    signal: NodeJS.Signals | null;
  }>((resolve) => {
    childProcess.on(
      'close',
      (exitCode: number, signal: NodeJS.Signals | null) => {
        resolve({ exitCode, signal });
      },
    );
  });

  logger.debug('Command exited', {
    stdout,
    errorMessage,
    command: fullCommand,
    pid: childProcess.pid,
    signal: result.signal,
    exitCode: result.exitCode,
    stdoutBytes: Buffer.byteLength(stdout),
    stderrBytes: Buffer.byteLength(errorMessage),
  });

  return {
    exitCode: result.exitCode,
    stdOut: trimNewLines(stdout),
    stdError: trimNewLines(errorMessage),
  };
}

function trimNewLines(output: string) {
  return output.replace(/^[\r\n]+|[\r\n]+$/g, '');
}
