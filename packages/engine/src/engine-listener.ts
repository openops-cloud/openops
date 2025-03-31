import { logger } from '@openops/server-shared';
import { debounce } from '@openops/shared';
import { ChildProcess } from 'child_process';
import chokidar, { FSWatcher } from 'chokidar';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import process, { cwd } from 'node:process';

let engineSubProcess: ChildProcess;
const ENGINE_SUBPROCESS_FLAG = 'engine-subprocess';

export function isDevEngine() {
  const args = process.argv.slice(1);
  return args[1] === ENGINE_SUBPROCESS_FLAG;
}

const debouncedRestart = debounce(async (fileWatcher: FSWatcher) => {
  logger.info('Engine dev subprocess restart triggered...');
  await fileWatcher.close();
  await startEngineSubProcess();
}, 2000);

function createFileWatcher(): void {
  const blocksPath = resolve(cwd(), 'packages', 'blocks');
  const commonPath = resolve(cwd(), 'packages', 'openops');
  const fileWatcher = chokidar.watch(
    [`${blocksPath}/**/*`, `${commonPath}/**/*`],
    {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 50,
      },
    },
  );

  fileWatcher.on('change', async (path) => {
    debouncedRestart(fileWatcher);
  });
}

export async function startEngineListener(): Promise<void> {
  await startEngineSubProcess();

  const shutdown = async (signal: string) => {
    setTimeout(() => {
      console.log('Dev mode: forcing shutdown of engine listener after 500 ms');
      process.exit(0);
    }, 500);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

async function startEngineSubProcess(): Promise<void> {
  const startJs = resolve(cwd(), 'dist', 'packages', 'engine', 'main.js');

  if (engineSubProcess && !engineSubProcess.killed) {
    await stopEngineSubProcess();
  }

  logger.info(`Start the engine subprocess`);

  engineSubProcess = spawn('node', [startJs, ENGINE_SUBPROCESS_FLAG], {
    stdio: 'inherit',
    env: process.env,
  });

  createFileWatcher();
}

function stopEngineSubProcess(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!engineSubProcess) {
      return resolve();
    }

    engineSubProcess.once('exit', () => {
      logger.info('The Engine dev subprocess exited.');
      resolve();
    });

    engineSubProcess.kill('SIGTERM');
  });
}
