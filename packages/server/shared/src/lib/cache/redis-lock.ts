import RedLock from 'redlock';
import { logger } from '../logger';
import { Lock } from '../memory-lock';
import { AppSystemProp, QueueMode, system } from '../system';
import { createRedisClient } from './redis-connection';

// By default, the timeout to wait to acquire a lock is 30 seconds
const DEFAULT_TIMEOUT_MS = 30000;
// So, we will try to acquire the lock 35 times during the timeout window before giving up
const DEFAULT_RETRY_COUNT = 35;
const DEFAULT_RETRY_DELAY = 700;
const DEFAULT_JITTER = 300;

type RedlockRetryConfig = {
  retryDelay: number;
  retryJitter: number;
};

const generateRedlockRetryConfig = (
  totalTimeoutMs: number,
): RedlockRetryConfig => {
  const scale = totalTimeoutMs / DEFAULT_TIMEOUT_MS;

  const retryDelay = Math.round(DEFAULT_RETRY_DELAY * scale);
  const retryJitter = Math.round(DEFAULT_JITTER * scale);

  return {
    retryDelay,
    retryJitter,
  };
};

const redLockClient = (() => {
  // TODO: Remove this check when we have the unit tests fixed.
  const isRedisConfigured =
    system.get<QueueMode>(AppSystemProp.QUEUE_MODE) === QueueMode.REDIS;
  if (!isRedisConfigured) {
    return;
  }

  const redisClient = createRedisClient();

  const { retryDelay, retryJitter } =
    generateRedlockRetryConfig(DEFAULT_TIMEOUT_MS);

  logger.debug('Creating redlock client.');

  return new RedLock([redisClient], {
    driftFactor: 0.01,
    retryCount: DEFAULT_RETRY_COUNT,
    retryDelay,
    retryJitter,
    automaticExtensionThreshold: 500,
  });
})();

export async function acquireRedisLock(
  key: string,
  timeout = DEFAULT_TIMEOUT_MS,
): Promise<Lock> {
  try {
    const { retryDelay, retryJitter } = generateRedlockRetryConfig(timeout);

    logger.debug(`Acquiring lock for key [${key}]`, { key, timeout });

    if (!redLockClient) {
      throw new Error('Redlock client is not created.');
    }

    const lock = await redLockClient.acquire([key], timeout, {
      retryDelay,
      retryJitter,
    });

    logger.info(`Acquired lock for key [${key}]`, { key, timeout });
    return lock;
  } catch (error) {
    logger.error(`Failed to acquire lock for key [${key}]`, { key, timeout });
    throw error;
  }
}
