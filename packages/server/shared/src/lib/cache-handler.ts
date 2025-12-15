import { isNil } from '@openops/shared';
import { readFile } from 'node:fs/promises';
import { join } from 'path';
import writeFileAtomic from 'write-file-atomic';
import { fileExists, threadSafeMkdir } from './file-system';
import { memoryLock } from './memory-lock';
import { SharedSystemProp, system } from './system';

type CacheMap = Record<string, string>;
const blockCacheEnabled =
  !(system.getBoolean(SharedSystemProp.BLOCKS_DEV_MODE_ENABLED) ?? false);

const cachePath = (folderPath: string): string =>
  join(folderPath, 'cache.json');

const cached: Record<string, CacheMap | null> = {};
const getCache = async (folderPath: string): Promise<CacheMap> => {
  if (isNil(cached[folderPath])) {
    const filePath = cachePath(folderPath);
    const cacheExists = await fileExists(filePath);
    if (!cacheExists) {
      await saveToCache({}, folderPath);
    }
    cached[folderPath] = await readCache(folderPath);
  }
  const cache = (cached[folderPath] as CacheMap) || {};
  return cache;
};

export const cacheHandler = (folderPath: string) => {
  return {
    async cacheCheckState(cacheAlias: string): Promise<string | undefined> {
      if (!blockCacheEnabled) {
        return undefined;
      }
      const lock = await memoryLock.acquire('cache_' + cacheAlias);
      try {
        const cache = await getCache(folderPath);
        return cache[cacheAlias];
      } finally {
        await lock.release();
      }
    },
    async setCache(cacheAlias: string, state: string): Promise<void> {
      const lock = await memoryLock.acquire('cache_' + cacheAlias);
      try {
        const cache = await getCache(folderPath);
        cache[cacheAlias] = state;
        await saveToCache(cache, folderPath);
      } finally {
        await lock.release();
      }
    },
  };
};

async function saveToCache(cache: CacheMap, folderPath: string): Promise<void> {
  await threadSafeMkdir(folderPath);
  const filePath = cachePath(folderPath);
  await writeFileAtomic(filePath, JSON.stringify(cache), 'utf8');
}

async function readCache(folderPath: string): Promise<CacheMap> {
  const filePath = cachePath(folderPath);
  const fileContent = await readFile(filePath, 'utf8');
  return JSON.parse(fileContent);
}
