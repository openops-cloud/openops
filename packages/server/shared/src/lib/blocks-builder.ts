import {
  readFileSync as readFileSyncSync,
  writeFileSync as writeFileSyncSync,
} from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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

const LOG_FIRST_BLOCKS = 3;

type DependencyBuildInfo = {
  name: string;
  path: string;
  lastModified: number;
  needsRebuild: boolean;
  type: 'block' | 'openops-common' | 'shared';
};

// Cache for tracking dependency modification times (persistent across runs)
const cacheFile = join(tmpdir(), 'openops-deps-cache.json');

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
  } catch (error) {
    logger.warn('Error saving build cache', { error });
  }
}

const depBuildCache = loadBuildCache();

async function getSharedInfo(): Promise<DependencyBuildInfo | null> {
  const sharedPath = join(cwd(), 'packages', 'shared');
  const packageJsonPath = join(sharedPath, 'package.json');

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

    if (packageJson.name === '@openops/shared') {
      const lastModified = await getDirectoryLastModified(sharedPath);
      const cached = depBuildCache.get(packageJson.name) ?? 0;
      const needsRebuild = lastModified > cached;

      logger.debug(
        `Shared: lastModified=${lastModified}, cached=${cached}, needsRebuild=${needsRebuild}`,
      );

      return {
        name: packageJson.name,
        path: sharedPath,
        lastModified,
        needsRebuild,
        type: 'shared',
      };
    }
  } catch (error) {
    logger.warn('Error checking shared package', { error });
  }

  return null;
}

async function getOpenOpsCommonInfo(): Promise<DependencyBuildInfo | null> {
  const openopsPath = join(cwd(), 'packages', 'openops');
  const packageJsonPath = join(openopsPath, 'package.json');

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

    if (packageJson.name === '@openops/common') {
      const lastModified = await getDirectoryLastModified(openopsPath);
      const cached = depBuildCache.get(packageJson.name) ?? 0;
      const needsRebuild = lastModified > cached;

      logger.debug(
        `OpenOps Common: lastModified=${lastModified}, cached=${cached}, needsRebuild=${needsRebuild}`,
      );

      return {
        name: packageJson.name,
        path: openopsPath,
        lastModified,
        needsRebuild,
        type: 'openops-common',
      };
    }
  } catch (error) {
    logger.warn('Error checking openops-common package', { error });
  }

  return null;
}

async function getBlocksWithChanges(): Promise<DependencyBuildInfo[]> {
  const blocksPath = join(cwd(), 'packages', 'blocks');
  const blocks: DependencyBuildInfo[] = [];

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
            const lastModified = await getDirectoryLastModified(fullPath);
            const cached = depBuildCache.get(packageJson.name) ?? 0;
            const needsRebuild = lastModified > cached;

            if (blocks.length < LOG_FIRST_BLOCKS) {
              logger.debug(
                `Block ${packageJson.name}: lastModified=${lastModified}, cached=${cached}, needsRebuild=${needsRebuild}`,
              );
            }

            blocks.push({
              name: packageJson.name,
              path: fullPath,
              lastModified,
              needsRebuild,
              type: 'block',
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
    } catch (error) {
      logger.warn('Error checking directory last modified', { error });
    }
  }

  await checkDir(dir);
  return maxTime;
}

export async function blocksBuilder(): Promise<void> {
  // Only run this script if the blocks source is file and the environment is dev
  if (!isFileBlocks || !isDevEnv) {
    return;
  }

  logger.info(
    'Development environment detected - using smart incremental building',
  );

  let lock: Lock | undefined;
  try {
    lock = await acquireRedisLock(`build-deps`, 60000);
    const startTime = performance.now();

    // Get all dependencies that might need rebuilding
    const [blocks, openopsCommon, shared] = await Promise.all([
      getBlocksWithChanges(),
      getOpenOpsCommonInfo(),
      getSharedInfo(),
    ]);

    const allDeps: DependencyBuildInfo[] = [...blocks];
    if (openopsCommon) {
      allDeps.push(openopsCommon);
    }
    if (shared) {
      allDeps.push(shared);
    }

    const depsToRebuild = allDeps.filter((d) => d.needsRebuild);
    const blocksToRebuild = depsToRebuild.filter((d) => d.type === 'block');
    const openopsToRebuild = depsToRebuild.filter(
      (d) => d.type === 'openops-common',
    );
    const sharedToRebuild = depsToRebuild.filter((d) => d.type === 'shared');

    logger.info(
      `Found ${allDeps.length} total dependencies, ${depsToRebuild.length} need rebuilding`,
    );

    if (depsToRebuild.length === 0) {
      logger.info('All dependencies are up to date, skipping build');
      return;
    }

    logger.info(
      `Building ${depsToRebuild.length} changed dependencies out of ${allDeps.length} total dependencies`,
    );

    // Build shared first (most foundational)
    if (sharedToRebuild.length > 0) {
      logger.info('Building shared...');
      await execAsync('nx run shared:build');

      // Update cache for shared
      for (const dep of sharedToRebuild) {
        depBuildCache.set(dep.name, dep.lastModified);
      }
    }

    // Build openops-common second (depends on shared, blocks depend on it)
    if (openopsToRebuild.length > 0) {
      logger.info('Building openops-common...');
      await execAsync('nx run openops-common:build');

      // Update cache for openops-common
      for (const dep of openopsToRebuild) {
        depBuildCache.set(dep.name, dep.lastModified);
      }
    }

    if (blocksToRebuild.length > 0) {
      logger.info(`Building ${blocksToRebuild.length} blocks...`);
      const blockNames = blocksToRebuild.map((b) =>
        b.name.replace('@openops/block-', 'blocks-'),
      );
      await execAsync(`nx run-many -t build -p ${blockNames.join(',')}`);
    }

    const buildDuration = Math.floor(performance.now() - startTime);
    logger.info(
      `Finished building ${depsToRebuild.length} dependencies in ${buildDuration}ms. Linking blocks...`,
    );

    for (const block of blocksToRebuild) {
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
        await stat(distPath);

        await execAsync(`cd "${distPath}" && npm link --no-audit --no-fund`);
        depBuildCache.set(block.name, block.lastModified);
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
      `Linked ${blocksToRebuild.length} blocks in ${linkDuration}ms. Dependencies are ready.`,
    );

    saveBuildCache(depBuildCache);
  } finally {
    await lock?.release();
  }
}
