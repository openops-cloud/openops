import { cwd } from 'node:process';
import { join } from 'path';
import { acquireRedisLock } from './cache/redis-lock';
import { execAsync } from './exec-async';
import { logger } from './logger';
import { Lock } from './memory-lock';
import { SharedSystemProp, system } from './system';

const isFileBlocks =
  system.getOrThrow(SharedSystemProp.BLOCKS_SOURCE) === 'FILE';
const isDevEnv = system.getOrThrow(SharedSystemProp.ENVIRONMENT) === 'dev';

export async function blocksBuilder(): Promise<void> {
  // Only run this script if the blocks source is file and the environment is dev
  if (!isFileBlocks || !isDevEnv) {
    return;
  }

  let lock: Lock | undefined;
  try {
    lock = await acquireRedisLock(`build-blocks`, 60000);
    const startTime = performance.now();
    await execAsync('nx run-many -t build -p blocks-*');
    const buildDuration = Math.floor(performance.now() - startTime);
    logger.info(
      `Finished building all blocks in ${buildDuration}ms. Linking blocks...`,
    );
    await execAsync(join(cwd(), 'tools/link-packages-to-root.sh'));
    const linkDuration = Math.floor(
      performance.now() - startTime - buildDuration,
    );

    logger.info(`Linked blocks in ${linkDuration}ms. All blocks are ready.`);
  } finally {
    await lock?.release();
  }
}
