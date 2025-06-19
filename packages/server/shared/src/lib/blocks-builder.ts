import {
  readFileSync as readFileSyncSync,
  writeFileSync as writeFileSyncSync,
} from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { cwd } from 'node:process';
import { join, relative } from 'path';
import { acquireRedisLock } from './cache/redis-lock';
import { execAsync } from './exec-async';
import { logger } from './logger';
import { Lock } from './memory-lock';
import { SharedSystemProp, system } from './system';

const isFileBlocks =
  system.getOrThrow(SharedSystemProp.BLOCKS_SOURCE) === 'FILE';
const isDevEnv = system.getOrThrow(SharedSystemProp.ENVIRONMENT) === 'dev';

type BlockBuildInfo = {
  name: string;
  path: string;
  lastModified: number;
  needsRebuild: boolean;
};

// Cache for tracking block modification times (persistent across runs)
const cacheFile = join(tmpdir(), 'openops-block-cache.json');

function loadBuildCache(): Map<string, number> {
  try {
    const data = readFileSyncSync(cacheFile, 'utf-8');
    const obj = JSON.parse(data);
    return new Map(Object.entries(obj).map(([k, v]) => [k, Number(v)]));
  } catch {
    return new Map();
  }
}

function saveBuildCache(cache: Map<string, number>): void {
  try {
    const obj = Object.fromEntries(cache);
    writeFileSyncSync(cacheFile, JSON.stringify(obj, null, 2));
  } catch {
    // Ignore save errors
  }
}

const blockBuildCache = loadBuildCache();

async function getBlocksWithChanges(): Promise<BlockBuildInfo[]> {
  const blocksPath = join(cwd(), 'packages', 'blocks');
  const blocks: BlockBuildInfo[] = [];

  async function findBlocks(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        !['node_modules', 'dist', 'framework', 'common'].includes(entry.name)
      ) {
        const fullPath = join(dir, entry.name);
        const packageJsonPath = join(fullPath, 'package.json');

        try {
          const packageJson = JSON.parse(
            await readFile(packageJsonPath, 'utf-8'),
          );
          if (packageJson.name?.startsWith('@openops/block-')) {
            // Get the most recent modification time in the block
            const lastModified = await getDirectoryLastModified(fullPath);
            const cached = blockBuildCache.get(packageJson.name) || 0;
            const needsRebuild = lastModified > cached;

            // Debug logging for first few blocks
            if (blocks.length < 3) {
              logger.debug(
                `Block ${packageJson.name}: lastModified=${lastModified}, cached=${cached}, needsRebuild=${needsRebuild}`,
              );
            }

            blocks.push({
              name: packageJson.name,
              path: fullPath,
              lastModified,
              needsRebuild,
            });
          } else {
            // Recurse into subdirectories
            await findBlocks(fullPath);
          }
        } catch {
          // No package.json or not a block, recurse
          await findBlocks(fullPath);
        }
      }
    }
  }

  await findBlocks(blocksPath);
  return blocks;
}

async function getDirectoryLastModified(dir: string): Promise<number> {
  let maxTime = 0;

  async function checkDir(currentDir: string): Promise<void> {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.name === 'node_modules' || entry.name === 'dist') {
          continue;
        }

        if (entry.isFile()) {
          const stats = await stat(fullPath);
          maxTime = Math.max(maxTime, stats.mtime.getTime());
        } else if (entry.isDirectory()) {
          await checkDir(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  await checkDir(dir);
  return maxTime;
}

export async function blocksBuilder(changedFiles?: string[]): Promise<void> {
  // Only run this script if the blocks source is file and the environment is dev
  if (!isFileBlocks || !isDevEnv) {
    return;
  }

  let lock: Lock | undefined;
  try {
    lock = await acquireRedisLock(`build-blocks`, 60000);
    const startTime = performance.now();

    // Get all blocks and check which ones need rebuilding
    const blocks = await getBlocksWithChanges();
    const blocksToRebuild = blocks.filter((b) => b.needsRebuild);

    logger.info(
      `Found ${blocks.length} total blocks, ${blocksToRebuild.length} need rebuilding`,
    );

    if (blocksToRebuild.length === 0) {
      logger.info('All blocks are up to date, skipping build');
      return;
    }

    logger.info(
      `Building ${blocksToRebuild.length} changed blocks out of ${blocks.length} total blocks`,
    );

    // Build only the changed blocks
    const blockNames = blocksToRebuild.map((b) =>
      b.name.replace('@openops/block-', 'blocks-'),
    );
    await execAsync(`nx run-many -t build -p ${blockNames.join(',')}`);

    const buildDuration = Math.floor(performance.now() - startTime);
    logger.info(
      `Finished building ${blocksToRebuild.length} blocks in ${buildDuration}ms. Linking blocks...`,
    );

    // Link only the changed blocks for better performance
    for (const block of blocksToRebuild) {
      // Extract block folder name from path (e.g., "sftp" from "packages/blocks/sftp")
      const blockFolderName = block.path.split('/').pop();
      if (!blockFolderName) {
        logger.warn(`Could not extract folder name from path: ${block.path}`);
        continue;
      }

      const distPath = join(
        cwd(),
        'dist',
        'packages',
        'blocks',
        blockFolderName,
      );

      try {
        // Check if the dist directory exists before trying to link
        await stat(distPath);

        await execAsync(`cd "${distPath}" && npm link --no-audit --no-fund`);
        blockBuildCache.set(block.name, block.lastModified);
        logger.debug(`Successfully linked block ${block.name}`);
      } catch (error) {
        const err = error as { code?: string };
        if (err.code === 'ENOENT') {
          logger.warn(
            `Skipping link for ${block.name} - dist directory not found: ${distPath}`,
          );
        } else {
          logger.warn(`Failed to link block ${block.name}:`, error);
        }
      }
    }

    const linkDuration = Math.floor(
      performance.now() - startTime - buildDuration,
    );
    logger.info(
      `Linked ${blocksToRebuild.length} blocks in ${linkDuration}ms. Blocks are ready.`,
    );

    // Save the updated cache
    saveBuildCache(blockBuildCache);
  } finally {
    await lock?.release();
  }
}
