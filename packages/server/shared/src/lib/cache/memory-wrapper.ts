import LRUCache from 'lru-cache';

const DEFAULT_EXPIRE_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

const cache = new LRUCache<string, string>({
  max: 500,
  ttl: DEFAULT_EXPIRE_TIME,
  updateAgeOnGet: true,
});

const setKey = async (
  key: string,
  value: string,
  expireInSeconds: number = DEFAULT_EXPIRE_TIME / 1000,
): Promise<void> => {
  cache.set(key, value, { ttl: expireInSeconds * 1000 });
};

const getKey = async (key: string): Promise<string | null> => {
  return cache.get(key) || null;
};

const deleteKey = async (key: string): Promise<void> => {
  cache.delete(key);
};

const keyExists = async (key: string): Promise<boolean> => {
  return cache.has(key);
};

async function setSerializedObject<T>(
  key: string,
  obj: T,
  expireInSeconds?: number,
): Promise<void> {
  await setKey(key, JSON.stringify(obj), expireInSeconds);
}

async function getSerializedObject<T>(key: string): Promise<T | null> {
  const result = await getKey(key);
  return result ? (JSON.parse(result) as T) : null;
}

async function getOrAdd<T, Args extends unknown[]>(
  key: string,
  createCallback: (...args: Args) => Promise<T>,
  args: Args,
  expireInSeconds?: number,
): Promise<T> {
  throw new Error('Not implemented');
}

export const memoryWrapper = {
  setKey,
  getKey,
  getOrAdd,
  deleteKey,
  keyExists,
  setSerializedObject,
  getSerializedObject,
};
