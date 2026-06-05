/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'node:events';

const mockTreeKill = jest.fn();
let mockStatSyncMtime = 1000;
const mockWatchFile = jest.fn();
const mockUnwatchFile = jest.fn();
const mockFork = jest.fn();

function createMockChildProcess(pid = 1000): any {
  const emitter = new EventEmitter();
  const child: any = Object.assign(emitter, {
    pid,
    exitCode: null,
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    send: jest.fn((_msg, cb) => {
      if (cb) {
        cb(null);
      }
      return true;
    }),
    kill: jest.fn(),
    removeAllListeners: jest.fn(function (this: any, event?: string) {
      if (event) {
        EventEmitter.prototype.removeAllListeners.call(this, event);
      } else {
        EventEmitter.prototype.removeAllListeners.call(this);
      }
      return this;
    }),
  });
  return child;
}

let pidCounter = 1000;
function setupMockFork(): void {
  mockFork.mockImplementation(() => createMockChildProcess(pidCounter++));
}

function getModule() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../src/lib/engine/engine-pool') as typeof import('../src/lib/engine/engine-pool');
}

describe('engine-pool', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();

    jest.doMock('tree-kill', () => ({
      __esModule: true,
      default: mockTreeKill,
    }));
    jest.doMock('fs', () => ({
      statSync: jest.fn(() => ({ mtimeMs: mockStatSyncMtime })),
      watchFile: mockWatchFile,
      unwatchFile: mockUnwatchFile,
    }));
    jest.doMock('child_process', () => ({ fork: mockFork }));
    jest.doMock('@openops/server-shared', () => ({
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
      },
      system: {
        get: jest.fn().mockReturnValue(undefined),
        getBoolean: jest.fn().mockReturnValue(false),
      },
      SharedSystemProp: { BLOCKS_DEV_MODE_ENABLED: 'BLOCKS_DEV_MODE_ENABLED' },
      WorkerSystemProps: {
        ENGINE_MEMORY_LIMIT_MB: 'ENGINE_MEMORY_LIMIT_MB',
        ENGINE_POOL_MIN_SIZE: 'ENGINE_POOL_MIN_SIZE',
        ENGINE_POOL_MAX_SIZE: 'ENGINE_POOL_MAX_SIZE',
        ENGINE_USER_ID: 'ENGINE_USER_ID',
        ENGINE_GROUP_ID: 'ENGINE_GROUP_ID',
      },
    }));

    mockFork.mockReset();
    mockTreeKill.mockReset();
    mockWatchFile.mockReset();
    mockUnwatchFile.mockReset();
    mockStatSyncMtime = 1000;
    pidCounter = 1000;
    setupMockFork();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initEnginePool', () => {
    it('spawns POOL_MIN_SIZE processes', () => {
      const { initEnginePool } = getModule();
      initEnginePool();
      expect(mockFork).toHaveBeenCalledTimes(1);
    });

    it('throws if min > max', () => {
      let initFn: any;
      jest.isolateModules(() => {
        jest.doMock('@openops/server-shared', () => ({
          logger: {
            info: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
          },
          system: {
            get: jest.fn((prop: string) => {
              if (prop === 'ENGINE_POOL_MIN_SIZE') {
                return '5';
              }
              if (prop === 'ENGINE_POOL_MAX_SIZE') {
                return '2';
              }
              return undefined;
            }),
            getBoolean: jest.fn().mockReturnValue(false),
          },
          SharedSystemProp: {
            BLOCKS_DEV_MODE_ENABLED: 'BLOCKS_DEV_MODE_ENABLED',
          },
          WorkerSystemProps: {
            ENGINE_MEMORY_LIMIT_MB: 'ENGINE_MEMORY_LIMIT_MB',
            ENGINE_POOL_MIN_SIZE: 'ENGINE_POOL_MIN_SIZE',
            ENGINE_POOL_MAX_SIZE: 'ENGINE_POOL_MAX_SIZE',
            ENGINE_USER_ID: 'ENGINE_USER_ID',
            ENGINE_GROUP_ID: 'ENGINE_GROUP_ID',
          },
        }));
        initFn = require('../src/lib/engine/engine-pool').initEnginePool; // eslint-disable-line @typescript-eslint/no-var-requires
      });
      expect(() => initFn()).toThrow(/cannot exceed/);
    });
  });

  describe('acquireEngine', () => {
    it('returns warm process when available', async () => {
      const { initEnginePool, acquireEngine } = getModule();
      initEnginePool();

      const child = mockFork.mock.results[0].value;
      child.emit('message', { type: 'ready' });

      const engine = await acquireEngine();
      expect(engine.child).toBe(child);
    });

    it('cold-forks when no warm process available', async () => {
      const { initEnginePool, acquireEngine } = getModule();
      initEnginePool();

      const acquirePromise = acquireEngine();

      const coldChild = mockFork.mock.results[2].value;
      coldChild.emit('message', { type: 'ready' });

      const engine = await acquirePromise;
      expect(engine.child).toBe(coldChild);
    });

    it('discards stale processes (bundleMtime < current)', async () => {
      const { initEnginePool, acquireEngine } = getModule();
      initEnginePool();

      const child = mockFork.mock.results[0].value;
      child.emit('message', { type: 'ready' });

      mockStatSyncMtime = 2000;

      const acquirePromise = acquireEngine();

      expect(mockTreeKill).toHaveBeenCalledWith(child.pid, 'SIGKILL');

      const coldChild =
        mockFork.mock.results[mockFork.mock.results.length - 1].value;
      coldChild.emit('message', { type: 'ready' });

      const engine = await acquirePromise;
      expect(engine.child).toBe(coldChild);
    });

    it('spawns extra warm process when cold-forking (scale up)', async () => {
      const { initEnginePool, acquireEngine } = getModule();
      initEnginePool();

      const forkCountBefore = mockFork.mock.calls.length;
      const acquirePromise = acquireEngine();

      const forkCountAfter = mockFork.mock.calls.length;
      expect(forkCountAfter - forkCountBefore).toBe(2);

      const coldChild = mockFork.mock.results[forkCountAfter - 1].value;
      coldChild.emit('message', { type: 'ready' });
      await acquirePromise;
    });
  });

  describe('scale-down (idle scaler)', () => {
    it('kills idle processes beyond min after timeout', () => {
      const { initEnginePool, acquireEngine } = getModule();
      initEnginePool();

      const child1 = mockFork.mock.results[0].value;
      child1.emit('message', { type: 'ready' });

      const acquirePromise = acquireEngine();
      const coldChild =
        mockFork.mock.results[mockFork.mock.results.length - 1].value;
      coldChild.emit('message', { type: 'ready' });

      for (const result of mockFork.mock.results) {
        const c = result.value;
        c.emit('message', { type: 'ready' });
      }

      jest.advanceTimersByTime(60_001);

      jest.advanceTimersByTime(30_000);

      acquirePromise.catch(() => {
        // ignore
      });
    });
  });

  describe('recyclePool', () => {
    it('kills all and respawns min', () => {
      const { initEnginePool } = getModule();
      initEnginePool();

      const child = mockFork.mock.results[0].value;
      child.emit('message', { type: 'ready' });

      mockFork.mockClear();
      mockTreeKill.mockClear();

      expect(mockWatchFile).toHaveBeenCalled();
      const watchCallback = mockWatchFile.mock.calls[0][2];
      watchCallback({ mtimeMs: 2000 }, { mtimeMs: 1000 });

      expect(mockTreeKill).toHaveBeenCalledWith(child.pid, 'SIGKILL');
      expect(mockFork).toHaveBeenCalledTimes(1);
    });
  });

  describe('shutdownEnginePool', () => {
    it('kills all processes and resolves immediately if no in-flight', async () => {
      const { initEnginePool, shutdownEnginePool } = getModule();
      initEnginePool();

      const child = mockFork.mock.results[0].value;
      child.emit('message', { type: 'ready' });

      mockTreeKill.mockClear();
      await shutdownEnginePool();

      expect(mockTreeKill).toHaveBeenCalledWith(child.pid, 'SIGKILL');
    });

    it('waits for in-flight engines before resolving', async () => {
      const {
        initEnginePool,
        acquireEngine,
        disposeEngine,
        shutdownEnginePool,
      } = getModule();
      initEnginePool();

      const child = mockFork.mock.results[0].value;
      child.emit('message', { type: 'ready' });

      const engine = await acquireEngine();

      let shutdownDone = false;
      const shutdownPromise = shutdownEnginePool().then(() => {
        shutdownDone = true;
      });

      await Promise.resolve();
      expect(shutdownDone).toBe(false);

      disposeEngine(engine);
      await shutdownPromise;
      expect(shutdownDone).toBe(true);
    });
  });

  describe('disposeEngine', () => {
    it('kills process after grace period if it has not exited', async () => {
      const { initEnginePool, acquireEngine, disposeEngine } = getModule();
      initEnginePool();

      const child = mockFork.mock.results[0].value;
      child.emit('message', { type: 'ready' });

      const engine = await acquireEngine();
      mockTreeKill.mockClear();

      disposeEngine(engine);

      expect(mockTreeKill).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5_000);
      expect(mockTreeKill).toHaveBeenCalledWith(child.pid, 'SIGKILL');
    });

    it('does not kill if process exits before grace period', async () => {
      const { initEnginePool, acquireEngine, disposeEngine } = getModule();
      initEnginePool();

      const child = mockFork.mock.results[0].value;
      child.emit('message', { type: 'ready' });

      const engine = await acquireEngine();
      mockTreeKill.mockClear();

      disposeEngine(engine);

      child.exitCode = 0;
      child.emit('exit', 0);

      jest.advanceTimersByTime(5_000);
      expect(mockTreeKill).not.toHaveBeenCalled();
    });
  });

  describe('PooledEngine.execute', () => {
    it('rejects if child already exited', async () => {
      const { PooledEngine } = getModule();
      const child = createMockChildProcess(9999);
      child.exitCode = 1;

      const engine = new PooledEngine(child);
      await expect(engine.execute('key', 30)).rejects.toThrow(/already exited/);
    });

    it('resolves with resultKey on success message', async () => {
      const { PooledEngine } = getModule();
      const child = createMockChildProcess(9999);

      const engine = new PooledEngine(child);
      const promise = engine.execute('input-key', 30);

      child.emit('message', { type: 'result', resultKey: 'output-key' });

      await expect(promise).resolves.toBe('output-key');
    });

    it('rejects on error message', async () => {
      const { PooledEngine } = getModule();
      const child = createMockChildProcess(9999);

      const engine = new PooledEngine(child);
      const promise = engine.execute('input-key', 30);

      child.emit('message', { type: 'error', message: 'something broke' });

      await expect(promise).rejects.toThrow('something broke');
    });

    it('rejects with EngineTimeoutError on timeout', async () => {
      const { PooledEngine, EngineTimeoutError } = getModule();
      const child = createMockChildProcess(9999);

      const engine = new PooledEngine(child);
      const promise = engine.execute('input-key', 5);

      jest.advanceTimersByTime(5_000);

      await expect(promise).rejects.toBeInstanceOf(EngineTimeoutError);
      expect(mockTreeKill).toHaveBeenCalledWith(9999, 'SIGKILL');
    });

    it('rejects with EngineOOMError on exit code 134', async () => {
      const { PooledEngine, EngineOOMError } = getModule();
      const child = createMockChildProcess(9999);

      const engine = new PooledEngine(child);
      const promise = engine.execute('input-key', 30);

      child.emit('exit', 134);

      await expect(promise).rejects.toBeInstanceOf(EngineOOMError);
    });

    it('rejects when send fails', async () => {
      const { PooledEngine } = getModule();
      const child = createMockChildProcess(9999);
      child.send = jest.fn(() => false);

      const engine = new PooledEngine(child);
      await expect(engine.execute('input-key', 30)).rejects.toThrow(
        /IPC channel closed/,
      );
    });
  });

  describe('dead process replacement', () => {
    it('replaces dead process when below min', () => {
      const { initEnginePool } = getModule();
      initEnginePool();

      const initialForkCount = mockFork.mock.calls.length;
      const child = mockFork.mock.results[0].value;

      child.emit('exit', 1);

      expect(mockFork.mock.calls.length).toBe(initialForkCount + 1);
    });

    it('does not replace dead process when above min', async () => {
      const { initEnginePool, acquireEngine } = getModule();
      initEnginePool();

      const acquirePromise = acquireEngine();

      const coldChild =
        mockFork.mock.results[mockFork.mock.results.length - 1].value;
      coldChild.emit('message', { type: 'ready' });
      await acquirePromise;

      const forkCountBefore = mockFork.mock.calls.length;

      const extraChild = mockFork.mock.results[1].value;
      extraChild.emit('message', { type: 'ready' });
      extraChild.emit('exit', 1);

      expect(mockFork.mock.calls.length).toBe(forkCountBefore);
    });
  });

  describe('startup timeout', () => {
    it('kills process and spawns replacement if startup times out', () => {
      const { initEnginePool } = getModule();
      initEnginePool();

      const child = mockFork.mock.results[0].value;
      const forkCountBefore = mockFork.mock.calls.length;

      jest.advanceTimersByTime(10_000);

      expect(mockTreeKill).toHaveBeenCalledWith(child.pid, 'SIGKILL');
      expect(mockFork.mock.calls.length).toBeGreaterThan(forkCountBefore);
    });
  });
});
