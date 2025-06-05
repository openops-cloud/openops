import { isEmpty } from '@openops/shared';
import { ExecException } from 'child_process';
import fs from 'fs/promises';
import fsPath from 'path';
import { enrichErrorContext } from './exception-handler';
import { execAsync } from './exec-async';
import { fileExists } from './file-system';
import { logger, truncate } from './logger';
import { memoryLock } from './memory-lock';

type PackageManagerOutput = {
  stdout: string;
  stderr: string;
};

type CoreCommand = 'add' | 'init -y' | 'link';
type ExecCommand = 'tsc' | 'install';
type Command = CoreCommand | ExecCommand;

export type PackageInfo = {
  /**
   * name or alias
   */
  alias: string;

  /**
   * where to get the package from, could be an npm tag, a local path, or a tarball.
   */
  spec: string;
};

const runCommand = async (
  path: string,
  command: Command,
  ...args: string[]
): Promise<PackageManagerOutput> => {
  const commandLine = `${getCommandExecutor(command)} ${command} ${args.join(
    ' ',
  )}`;
  const commandSummary = `${path.split('/').at(-1)}$ ${truncate(
    commandLine,
    30,
  )}`;

  logger.debug(`Executing command [${commandSummary}]`, {
    path,
    commandLine,
  });

  const startTime = performance.now();

  try {
    const commandOutput = await execAsync(commandLine, { cwd: path });
    const duration = Math.round(performance.now() - startTime);
    logger.info(
      `Successfully executed command [${commandSummary}] in ${duration}ms`,
      {
        path,
        commandLine,
        durationMs: duration,
        stdout: commandOutput.stdout,
        stderr: commandOutput.stderr,
      },
    );

    return commandOutput;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error(
      `Failed to execute command [${commandSummary}] after ${duration}ms`,
      {
        path,
        commandLine,
        args,
        error,
      },
    );

    throw error;
  }
};

export const packageManager = {
  async add({ path, dependencies }: AddParams): Promise<PackageManagerOutput> {
    if (isEmpty(dependencies)) {
      return {
        stdout: '',
        stderr: '',
      };
    }

    const config = [
      '--prefer-offline',
      '--ignore-scripts',
      '--config.lockfile=false',
      '--config.auto-install-peers=true',
    ];

    const dependencyArgs = dependencies.map((d) => `${d.alias}@${d.spec}`);
    return runCommand(path, 'add', ...dependencyArgs, ...config);
  },

  async init({ path }: InitParams): Promise<PackageManagerOutput> {
    const lock = await memoryLock.acquire(`npm-init-${path}`);
    try {
      const fExists = await fileExists(fsPath.join(path, 'package.json'));
      if (fExists) {
        return {
          stdout: 'N/A',
          stderr: 'N/A',
        };
      }
      // It must be awaited so it only releases the lock after the command is done
      const result = await runCommand(path, 'init -y');
      return result;
    } finally {
      await lock.release();
    }
  },

  async exec({
    path,
    command,
    args,
  }: ExecParams): Promise<PackageManagerOutput> {
    return runCommand(path, command, ...(args ?? []));
  },

  async link({
    path,
    linkPath,
    packageName,
  }: LinkParams): Promise<PackageManagerOutput> {
    logger.info(`Linking ${packageName} to ${linkPath} in ${path}`);

    const lock = await memoryLock.acquire(`link-${packageName}`, 60 * 1000);

    try {
      const config = [
        '--config.lockfile=false',
        '--config.auto-install-peers=true',
      ];

      const result = await runCommand(path, 'link', linkPath, ...config);

      const nodeModules = fsPath.join(path, 'node_modules', packageName);

      await replaceRelativeSystemLinkWithAbsolute(nodeModules);

      return result;
    } finally {
      await lock.release();
    }
  },
};

const replaceRelativeSystemLinkWithAbsolute = async (filePath: string) => {
  try {
    // Inside the isolate sandbox, the relative path is not valid

    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      const realPath = await fs.realpath(filePath);
      logger.info(`Linking ${filePath} > ${realPath}`, { realPath, filePath });
      await fs.unlink(filePath);
      await fs.symlink(realPath, filePath, 'dir');
      logger.info('Linked', { realPath, filePath });
    }
  } catch (error) {
    logger.error('Failed to link', {
      ...(error as Error),
      filePath,
    });
  }
};

type AddParams = {
  path: string;
  dependencies: PackageInfo[];
};

type InitParams = {
  path: string;
};

type ExecParams = {
  path: string;
  command: ExecCommand;
  args?: string[];
};

type LinkParams = {
  path: string;
  linkPath: string;
  packageName: string;
};

function getCommandExecutor(command: Command): string {
  return command === 'tsc' ? 'npx' : 'pnpm';
}
