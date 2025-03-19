import {
  cacheWrapper,
  flowTimeoutSandbox,
  logger,
} from '@openops/server-shared';
import { Mutex, Semaphore, tryAcquire } from 'async-mutex';

const ALREADY_ACQUIRED_ERROR = 'Lock already acquired.';

type LockParams = {
  lock: Mutex;
  semaphores: Map<string, { semaphore: Semaphore; expiresAt: number }>;
};

class CacheAccessSemaphore {
  private static instance: LockParams;
  static getInstance(): LockParams {
    if (!CacheAccessSemaphore.instance) {
      CacheAccessSemaphore.instance = {
        lock: new Mutex(),
        semaphores: new Map<
          string,
          { semaphore: Semaphore; expiresAt: number }
        >(),
      };

      setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of this.instance.semaphores) {
          if (now >= entry.expiresAt) {
            this.instance.semaphores.delete(key);
          }
        }
      }, 300000); // 5 minutes
    }

    return CacheAccessSemaphore.instance;
  }
}

export async function wrapWithCacheGuard<T, Args extends any[]>(
  cacheKey: string,
  fn: (...args: Args) => Promise<T>,
  ...args: Args
): Promise<T> {
  let result = await cacheWrapper.getSerializedObject<T>(cacheKey);
  if (result) {
    return result;
  }

  const { lock, semaphores } = CacheAccessSemaphore.getInstance();
  let semaphore = semaphores.get(cacheKey)?.semaphore;
  while (!semaphore) {
    try {
      await tryAcquire(lock, new Error(ALREADY_ACQUIRED_ERROR)).runExclusive(
        async () => {
          semaphore = semaphores.get(cacheKey)?.semaphore;
          if (!semaphore) {
            semaphore = new Semaphore(1);
            semaphores.set(cacheKey, {
              semaphore,
              expiresAt: getSemaphoreExpiration(),
            });
          }
        },
      );
    } catch (e) {
      result = await waitForUnlock(lock, e as Error, cacheKey);
      semaphore = semaphores.get(cacheKey)?.semaphore;
      if (result) {
        return result;
      }
    }
  }

  return getReturnValue(semaphore, cacheKey, fn, ...args);
}

async function getReturnValue<T, Args extends any[]>(
  semaphore: Semaphore,
  cacheKey: string,
  fn: (...args: Args) => Promise<T>,
  ...args: Args
): Promise<T> {
  let result = await cacheWrapper.getSerializedObject<T>(cacheKey);
  if (result) {
    return result;
  }

  while (!result) {
    try {
      await tryAcquire(
        semaphore,
        new Error(ALREADY_ACQUIRED_ERROR),
      ).runExclusive(async () => {
        result = await cacheWrapper.getSerializedObject<T>(cacheKey);
        if (!result) {
          result = await fn(...args);
          await cacheWrapper.setSerializedObject(
            cacheKey,
            result,
            flowTimeoutSandbox,
          );
        }
      });

      if (result) {
        return result;
      }
    } catch (e) {
      result = await waitForUnlock(semaphore, e as Error, cacheKey);
      if (result) {
        return result;
      }
    }
  }

  return result;
}

async function waitForUnlock<T>(
  lock: any,
  error: Error,
  cacheKey: string,
): Promise<T | null> {
  if (error.message !== ALREADY_ACQUIRED_ERROR) {
    logger.error(ALREADY_ACQUIRED_ERROR, { error });
    throw error;
  }

  const result = await cacheWrapper.getSerializedObject<T>(cacheKey);
  if (result) {
    return result;
  }

  await lock.waitForUnlock();

  return await cacheWrapper.getSerializedObject<T>(cacheKey);
}

function getSemaphoreExpiration(): number {
  return Date.now() + flowTimeoutSandbox * 1000;
}
