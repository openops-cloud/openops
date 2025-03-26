import Redis from 'ioredis';
import { logger } from '../logger';
import { Lock } from '../memory-lock';
import { createRedisClient } from './redis-connection';
import { acquireRedisLock } from './redis-lock';

let client: Redis | null = null;

// Default expire time is 1 hour
const DEFAULT_EXPIRE_TIME = 60 * 60;

const setKey = async (
  key: string,
  value: string,
  expireInSeconds: number = DEFAULT_EXPIRE_TIME,
): Promise<void> => {
  const redis = getRedisClient();
  await redis.set(key, value, 'EX', expireInSeconds);
};

const getKey = async (key: string): Promise<string | null> => {
  const redis = getRedisClient();
  return redis.get(key);
};

const deleteKey = async (key: string): Promise<void> => {
  const redis = getRedisClient();
  await redis.del(key);
};

const keyExists = async (key: string): Promise<boolean> => {
  const redis = getRedisClient();
  const result = await redis.exists(key);
  return result === 1;
};

async function setSerializedObject<T>(
  key: string,
  obj: T,
  expireInSeconds?: number,
): Promise<void> {
  await setKey(key, JSON.stringify(obj), expireInSeconds);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOrAdd<T, Args extends any[]>(
  key: string,
  createCallback: (...args: Args) => Promise<T>,
  args: Args,
  expireInSeconds?: number,
): Promise<T> {
  const value = await getSerializedObject<T>(key);

  if (value !== null) {
    return value;
  }

  let lock: Lock | undefined;
  try {
    lock = await acquireRedisLock(`lock:${key}`);
    const value = await getSerializedObject<T>(key);
    if (value !== null) {
      return value;
    }

    const result = await createCallback(...args);
    await setSerializedObject(key, result, expireInSeconds);
    return result;
  } finally {
    await lock?.release();
  }
}

async function getSerializedObject<T>(key: string): Promise<T | null> {
  const result = await getKey(key);
  return result ? (JSON.parse(result) as T) : null;
}

const getRedisClient = (): Redis => {
  if (!client) {
    client = createRedisClient();

    client.on('error', (error) => {
      logger.error('Redis error:', error);
    });

    client.on('end', () => {
      client = null;
    });
  }

  return client;
};

export const redisWrapper = {
  setKey,
  getKey,
  getOrAdd,
  deleteKey,
  keyExists,
  setSerializedObject,
  getSerializedObject,
};
