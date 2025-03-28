import { logger } from '@openops/server-shared';
import { debounce } from '@openops/shared';
import { Mutex } from 'async-mutex';
import { ChildProcess } from 'child_process';
import chokidar from 'chokidar';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import process, { cwd } from 'node:process';

const mutex = new Mutex();
let initialized = false;
let engineSubProcess: ChildProcess;
const ENGINE_SUBPROCESS_FLAG = 'engine-subprocess';

export function isDevEngine() {
  const args = process.argv.slice(1);
  return args[1] === ENGINE_SUBPROCESS_FLAG;
}

export function startEngineListener() {
  const debouncedRestart = debounce(async () => {
    logger.info('Engine dev subprocess debounce restart triggered...');
    await stopEngineSubProcess();
    startEngineSubProcess();
  }, 1000);

  mutex
    .runExclusive(() => {
      if (!initialized) {
        startEngineSubProcess();
      }
    })
    .catch((err) => {
      logger.info(`Failed to start the engine dev subprocess.`, err);
    });

  const blocksPath = resolve(cwd(), 'dist', 'packages', 'blocks');
  const watcher = chokidar.watch(`${blocksPath}/**/*`, {
    ignoreInitial: true,
  });

  watcher.on('change', () => {
    if (initialized) {
      debouncedRestart();
    }
  });
}

function startEngineSubProcess(): void {
  const startJs = resolve(cwd(), 'dist', 'packages', 'engine', 'main.js');

  engineSubProcess = spawn('node', [startJs, ENGINE_SUBPROCESS_FLAG], {
    stdio: 'inherit',
    env: process.env,
  });

  engineSubProcess.on('exit', () => {
    logger.info('The Engine dev subprocess is shutting down.');
  });

  initialized = true;
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
