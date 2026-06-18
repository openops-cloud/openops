import {
  logger,
  SharedSystemProp,
  system,
  WorkerSystemProps,
} from '@openops/server-shared';
import { ChildProcess, fork } from 'node:child_process';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import treeKill from 'tree-kill';

const DEV_MODE = system.getBoolean(SharedSystemProp.BLOCKS_DEV_MODE_ENABLED);
const ENGINE_PATH = resolve(process.cwd(), 'dist/packages/engine/main.js');

const ENGINE_MEMORY_LIMIT_MB = Number(
  system.getOrThrow(WorkerSystemProps.ENGINE_MEMORY_LIMIT_MB),
);

const POOL_MIN_SIZE = Math.max(
  0,
  Number(system.getOrThrow(WorkerSystemProps.ENGINE_POOL_MIN_SIZE)),
);

const POOL_MAX_SIZE = Math.max(
  1,
  Number(system.getOrThrow(WorkerSystemProps.ENGINE_POOL_MAX_SIZE)),
);

const ENGINE_DEBUG_BASE_PORT = 9231;
const STARTUP_TIMEOUT_MS = 10_000;
const IDLE_SCALE_DOWN_MS = 60_000;
const GRACE_PERIOD_MS = 5_000;
let engineForkCounter = 0;

function pipeWithPrefix(child: ChildProcess): void {
  child.stdout?.on('data', (data: Buffer) => {
    if (!DEV_MODE) {
      return;
    }

    const lines = data.toString().trimEnd().split('\n');
    for (const line of lines) {
      process.stdout.write(`[ENG] ${line}\n`);
    }
  });
}

function getBundleMtime(): number {
  try {
    return statSync(ENGINE_PATH).mtimeMs;
  } catch {
    return 0;
  }
}

export class EngineTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineTimeoutError';
  }
}

export class EngineOOMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineOOMError';
  }
}

export class PooledEngine {
  constructor(public readonly child: ChildProcess) {}

  execute(inputKey: string, timeoutSeconds: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (this.child.exitCode !== null) {
        reject(
          new Error(
            `Engine already exited with code ${this.child.exitCode} before execute`,
          ),
        );
        return;
      }

      let settled = false;
      const stderrChunks: string[] = [];
      // eslint-disable-next-line prefer-const
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        settled = true;

        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        this.child.stderr?.removeListener('data', onStderr);
        this.child.removeListener('message', onMessage);
        this.child.removeListener('exit', onExit);
      };

      const onStderr = (data: Buffer) => {
        stderrChunks.push(data.toString());
      };

      const onMessage = (msg: unknown) => {
        if (settled || !msg || typeof msg !== 'object') {
          return;
        }

        const message = msg as {
          type: string;
          resultKey?: string;
          message?: string;
        };

        if (message.type === 'result' && message.resultKey) {
          cleanup();
          resolve(message.resultKey);
        } else if (message.type === 'error') {
          cleanup();
          reject(new Error(message.message ?? 'Engine error'));
        }
      };

      const onExit = (code: number | null) => {
        if (settled) {
          return;
        }

        cleanup();
        const stderr = stderrChunks.join('');

        if (code === 134) {
          reject(new EngineOOMError(`Engine OOM (exit code 134): ${stderr}`));
        } else {
          reject(
            new Error(
              `Engine exited unexpectedly with code ${code}: ${stderr}`,
            ),
          );
        }
      };

      this.child.stderr?.on('data', onStderr);
      this.child.on('message', onMessage);
      this.child.on('exit', onExit);

      timeoutHandle = setTimeout(() => {
        if (settled) {
          return;
        }

        cleanup();
        if (this.child.pid) {
          treeKill(this.child.pid, 'SIGKILL');
        }

        reject(
          new EngineTimeoutError(`Engine timed out after ${timeoutSeconds}s`),
        );
      }, timeoutSeconds * 1000);

      try {
        const sent = this.child.send({ type: 'execute', inputKey }, (err) => {
          if (err && !settled) {
            cleanup();
            reject(new Error(`Failed to send message to engine: ${err}`));
          }
        });

        if (!sent && !settled) {
          cleanup();
          reject(
            new Error('Failed to send message to engine: IPC channel closed'),
          );
        }
      } catch (err) {
        cleanup();
        reject(new Error(`Failed to send message to engine: ${err}`));
      }
    });
  }
}

type PoolEntry = {
  child: ChildProcess;
  state: 'spawning' | 'ready';
  startupTimer?: ReturnType<typeof setTimeout>;
  bundleMtime: number;
  readySince?: number;
};

const pool: PoolEntry[] = [];
let inFlightCount = 0;
let draining = false;
let shutdownResolve: (() => void) | undefined;

// Only pass env vars the engine actually needs (principle of least privilege).
const ENGINE_ALLOWED_ENV_KEYS = new Set([
  'OPS_VERSION',
  'OPS_FRONTEND_URL',
  'OPS_ENCRYPTION_KEY',
  'OPS_CONTAINER_TYPE',
  'OPS_SERVER_API_URL',

  'OPS_QUEUE_MODE',

  // Redis
  'OPS_REDIS_DB',
  'OPS_REDIS_URL',
  'OPS_REDIS_USER',
  'OPS_REDIS_HOST',
  'OPS_REDIS_PORT',
  'OPS_REDIS_USE_SSL',
  'OPS_REDIS_PASSWORD',

  // Logs
  'OPS_LOG_LEVEL',
  'OPS_LOG_PRETTY',
  'OPS_LOGZIO_TOKEN',
  'OPS_LOG_REDACTION',
  'OPS_ENVIRONMENT_NAME',

  // Blocks
  'OPS_ENABLE_HOST_SESSION',
  'OPS_AWS_ENABLE_IMPLICIT_ROLE',
  'OPS_AWS_USE_AZURE_MANAGED_IDENTITY',
  'OPS_AWS_AZURE_FEDERATION_ROLE_ARN',
  'OPS_ENABLE_HOST_VALIDATION',
  'OPS_SMTP_ALLOWED_PORTS',
  'OPS_AZURE_API_VERSION',
  'OPS_OPENOPS_TABLES_API_URL',
  'OPS_CODE_BLOCK_MEMORY_LIMIT_IN_MB',
  'OPS_EXEC_FILE_MAX_BUFFER_SIZE_MB',
  'OPS_BASE_CODE_DIRECTORY',
  'OPS_ENABLE_SLACK_INTERACTIONS',
]);

function buildEngineEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) {
      continue;
    }

    if (ENGINE_ALLOWED_ENV_KEYS.has(key)) {
      env[key] = value;
    }
  }

  env['NODE_PATH'] = resolve(process.cwd(), 'node_modules');
  env['OPS_COMPONENT'] = 'engine';

  // Inherit PATH so engine can find CLI tools (aws, az, gcloud, etc.)
  if (process.env['PATH']) {
    env['PATH'] = process.env['PATH'];
  }

  // Inherit HOME and CLI config dirs for tool execution
  if (process.env['HOME']) {
    env['HOME'] = process.env['HOME'];
  }

  if (process.env['AZURE_CONFIG_DIR']) {
    env['AZURE_CONFIG_DIR'] = process.env['AZURE_CONFIG_DIR'];
  }

  if (process.env['AZURE_EXTENSION_DIR']) {
    env['AZURE_EXTENSION_DIR'] = process.env['AZURE_EXTENSION_DIR'];
  }

  if (process.env['CLOUDSDK_CONFIG']) {
    env['CLOUDSDK_CONFIG'] = process.env['CLOUDSDK_CONFIG'];
  }

  return env;
}

function forkEngine(index: number): ChildProcess {
  const execArgv = [
    '--no-node-snapshot',
    `--max-old-space-size=${ENGINE_MEMORY_LIMIT_MB}`,
  ];

  if (DEV_MODE) {
    execArgv.push(`--inspect=0.0.0.0:${ENGINE_DEBUG_BASE_PORT + index}`);
  }

  return fork(ENGINE_PATH, [], {
    execArgv,
    env: buildEngineEnv(),
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
}

function spawnPoolProcess(): void {
  if (draining) {
    return;
  }

  const child = forkEngine(engineForkCounter++ % POOL_MAX_SIZE);

  pipeWithPrefix(child);

  const entry: PoolEntry = {
    child,
    state: 'spawning',
    bundleMtime: getBundleMtime(),
  };

  entry.startupTimer = setTimeout(() => {
    logger.warn(
      'Process failed to become ready within startup timeout, killing',
      { pid: child.pid },
    );

    removeEntry(entry);
    killProcess(child);
    spawnPoolProcess();
  }, STARTUP_TIMEOUT_MS);

  child.on('message', (msg: unknown) => {
    if (!msg || typeof msg !== 'object') {
      return;
    }

    const message = msg as { type: string };
    if (message.type === 'ready' && entry.state === 'spawning') {
      if (entry.startupTimer) {
        clearTimeout(entry.startupTimer);
        entry.startupTimer = undefined;
      }

      entry.state = 'ready';
      entry.readySince = Date.now();
      logger.debug('Process ready', { pid: child.pid });
    }
  });

  child.on('exit', (code) => {
    const idx = pool.indexOf(entry);
    if (idx !== -1) {
      if (entry.startupTimer) {
        clearTimeout(entry.startupTimer);
      }

      pool.splice(idx, 1);
      if (pool.length < POOL_MIN_SIZE) {
        logger.warn('Process died, spawning replacement to maintain min size', {
          pid: child.pid,
          code,
        });

        spawnPoolProcess();
      } else {
        logger.warn('Excess process died, not replacing', {
          pid: child.pid,
          code,
        });
      }
    }
  });

  pool.push(entry);
}

function removeEntry(entry: PoolEntry): void {
  const idx = pool.indexOf(entry);
  if (idx !== -1) {
    pool.splice(idx, 1);
  }

  if (entry.startupTimer) {
    clearTimeout(entry.startupTimer);
    entry.startupTimer = undefined;
  }
}

function killProcess(child: ChildProcess): void {
  if (child.pid) {
    treeKill(child.pid, 'SIGKILL');
  }
}

function greedyRefill(): void {
  if (draining) {
    return;
  }

  const currentCount = pool.length;
  const toSpawn = POOL_MIN_SIZE - currentCount;
  for (let i = 0; i < toSpawn; i++) {
    spawnPoolProcess();
  }
}

export function initEnginePool(): void {
  if (POOL_MAX_SIZE <= 0) {
    return;
  }

  if (POOL_MIN_SIZE > POOL_MAX_SIZE) {
    throw new Error(
      `ENGINE_POOL_MIN_SIZE (${POOL_MIN_SIZE}) cannot exceed ENGINE_POOL_MAX_SIZE (${POOL_MAX_SIZE})`,
    );
  }

  logger.info('Initializing engine pool', {
    minSize: POOL_MIN_SIZE,
    maxSize: POOL_MAX_SIZE,
  });

  for (let i = 0; i < POOL_MIN_SIZE; i++) {
    spawnPoolProcess();
  }

  startIdleScaler();
}

export async function acquireEngine(): Promise<PooledEngine> {
  const currentMtime = getBundleMtime();
  // Discard stale processes until we find a valid one or exhaust the pool
  let readyIdx = pool.findIndex((e) => e.state === 'ready');
  while (readyIdx !== -1) {
    const entry = pool[readyIdx];
    pool.splice(readyIdx, 1);
    if (entry.startupTimer) {
      clearTimeout(entry.startupTimer);
    }

    if (entry.bundleMtime < currentMtime) {
      logger.info('Discarding stale engine process', {
        pid: entry.child.pid,
      });
      entry.child.removeAllListeners('exit');
      killProcess(entry.child);
      readyIdx = pool.findIndex((e) => e.state === 'ready');
      continue;
    }

    entry.child.removeAllListeners('exit');
    inFlightCount++;
    greedyRefill();
    logger.debug('Acquired warm engine', {
      pid: entry.child.pid,
    });
    return new PooledEngine(entry.child);
  }

  logger.debug('No warm engine available, cold-forking');
  inFlightCount++;

  if (pool.length < POOL_MAX_SIZE) {
    spawnPoolProcess();
  }

  const child = forkEngine(engineForkCounter++ % POOL_MAX_SIZE);

  pipeWithPrefix(child);

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      child.removeListener('message', onMessage);
      child.removeListener('exit', onExit);
      clearTimeout(timer);
    };

    const timer = setTimeout(() => {
      cleanup();
      killProcess(child);
      inFlightCount--;
      reject(new Error('Cold-forked engine failed to become ready'));
    }, STARTUP_TIMEOUT_MS);

    const onMessage = (msg: unknown) => {
      if (!msg || typeof msg !== 'object') {
        return;
      }

      const message = msg as { type: string };
      if (message.type === 'ready') {
        cleanup();
        resolve();
      }
    };

    const onExit = (code: number | null) => {
      cleanup();
      inFlightCount--;
      reject(
        new Error(`Cold-forked engine exited during startup with code ${code}`),
      );
    };

    child.on('message', onMessage);
    child.on('exit', onExit);
  });

  return new PooledEngine(child);
}

/** Dispose of an engine process after execution (one-shot model: engines are not reused). */
export function disposeEngine(engine: PooledEngine): void {
  inFlightCount--;

  if (draining) {
    if (engine.child.exitCode === null) {
      killProcess(engine.child);
    }
  } else {
    const timer = setTimeout(() => {
      if (engine.child.exitCode === null) {
        killProcess(engine.child);
      }
    }, GRACE_PERIOD_MS);

    engine.child.once('exit', () => clearTimeout(timer));
  }

  if (draining && inFlightCount === 0 && shutdownResolve) {
    shutdownResolve();
    shutdownResolve = undefined;
  }
}

export async function shutdownEnginePool(): Promise<void> {
  draining = true;

  if (idleScalerInterval) {
    clearInterval(idleScalerInterval);
    idleScalerInterval = undefined;
  }

  // Kill all idle and spawning processes
  for (const entry of pool) {
    if (entry.startupTimer) {
      clearTimeout(entry.startupTimer);
    }
    killProcess(entry.child);
  }

  pool.length = 0;
  if (inFlightCount > 0) {
    await new Promise<void>((resolve) => {
      shutdownResolve = resolve;
    });
  }

  logger.info('Engine pool shut down');
}

let idleScalerInterval: ReturnType<typeof setInterval> | undefined;
function startIdleScaler(): void {
  idleScalerInterval = setInterval(() => {
    if (draining || pool.length <= POOL_MIN_SIZE) {
      return;
    }

    const now = Date.now();
    const excess = pool.filter(
      (e) =>
        e.state === 'ready' &&
        e.readySince !== undefined &&
        now - e.readySince > IDLE_SCALE_DOWN_MS,
    );

    const toKill = Math.min(excess.length, pool.length - POOL_MIN_SIZE);
    for (let i = 0; i < toKill; i++) {
      const entry = excess[i];
      logger.info('Scaling down idle process', {
        pid: entry.child.pid,
      });

      entry.child.removeAllListeners('exit');
      removeEntry(entry);
      killProcess(entry.child);
    }
  }, IDLE_SCALE_DOWN_MS / 2);
}
