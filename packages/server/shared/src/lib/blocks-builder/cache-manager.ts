import {
  readFileSync as readFileSyncSync,
  writeFileSync as writeFileSyncSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'path';
import { logger } from '../logger';

// Cache for tracking dependency modification times (persistent across runs)
const cacheFile = join(tmpdir(), 'openops-deps-cache.json');

export function loadBuildCache(): Map<string, number> {
  try {
    const data = readFileSyncSync(cacheFile, 'utf-8');
    const obj = JSON.parse(data);
    return new Map(Object.entries(obj).map(([k, v]) => [k, Number(v)]));
  } catch {
    return new Map();
  }
}

export function saveBuildCache(cache: Map<string, number>): void {
  try {
    const obj = Object.fromEntries(cache);
    writeFileSyncSync(cacheFile, JSON.stringify(obj, null, 2));
  } catch (error) {
    logger.warn('Error saving build cache', { error });
  }
}
