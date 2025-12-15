import { cwd } from 'node:process';
import { join } from 'path';
import {
  buildDependencies,
  linkBlocks,
} from './blocks-builder/build-orchestrator';
import { loadBuildCache, saveBuildCache } from './blocks-builder/cache-manager';
import {
  getBlocksWithChanges,
  getOpenOpsCommonInfo,
  getServerSharedInfo,
  getSharedInfo,
  setDependencyCache,
} from './blocks-builder/dependency-analyzer';
import { BuildResult, DependencyBuildInfo } from './blocks-builder/types';
import { loadBlockMetadataFromFolder } from './blocks/file-blocks-utils';
import { acquireRedisLock } from './cache/redis-lock';
import { logger } from './logger';
import { Lock } from './memory-lock';
import { SharedSystemProp, system } from './system';

const isFileBlocks =
  system.getOrThrow(SharedSystemProp.BLOCKS_SOURCE) === 'FILE';
const blocksDevModeEnabled =
  system.getBoolean(SharedSystemProp.BLOCKS_DEV_MODE_ENABLED) ?? false;

const depBuildCache = loadBuildCache();

async function updateBlockMetadataCache(
  depsToRebuild: DependencyBuildInfo[],
): Promise<void> {
  for (const dep of depsToRebuild) {
    if (dep.type !== 'block') {
      continue;
    }

    try {
      const distPath = join(
        cwd(),
        'dist',
        'packages',
        'blocks',
        dep.name.replace('@openops/block-', ''),
      );

      const blockMetadata = await loadBlockMetadataFromFolder(distPath, {
        bypassCache: true,
      });

      if (blockMetadata) {
        logger.debug(`Updated block metadata cache for ${blockMetadata.name}`);
      } else {
        logger.warn(`Failed to load block metadata for ${dep.name}`);
      }
    } catch (error) {
      logger.warn(
        `Failed to update block metadata cache for ${dep.name}:`,
        error,
      );
    }
  }
}

async function analyzeDependencies(): Promise<BuildResult> {
  // Set the dependency cache for the analyzer functions
  setDependencyCache(depBuildCache);

  // Get all dependencies that might need rebuilding
  const [blocks, openopsCommon, shared, serverShared] = await Promise.all([
    getBlocksWithChanges(),
    getOpenOpsCommonInfo(),
    getSharedInfo(),
    getServerSharedInfo(),
  ]);

  const allDeps = [...blocks];
  if (openopsCommon) {
    allDeps.push(openopsCommon);
  }
  if (shared) {
    allDeps.push(shared);
  }
  if (serverShared) {
    allDeps.push(serverShared);
  }

  const depsToRebuild = allDeps.filter((d) => d.needsRebuild);
  const blocksToRebuild = depsToRebuild.filter((d) => d.type === 'block');
  const openopsToRebuild = depsToRebuild.filter(
    (d) => d.type === 'openops-common',
  );
  const sharedToRebuild = depsToRebuild.filter((d) => d.type === 'shared');
  const serverSharedToRebuild = depsToRebuild.filter(
    (d) => d.type === 'server-shared',
  );

  return {
    blocks,
    allDeps,
    depsToRebuild,
    blocksToRebuild,
    openopsToRebuild,
    sharedToRebuild,
    serverSharedToRebuild,
  };
}

export async function blocksBuilder(): Promise<void> {
  // Only run this script if the blocks source is file and incremental building is enabled
  if (!isFileBlocks || !blocksDevModeEnabled) {
    return;
  }

  logger.info('Blocks dev mode enabled - using smart incremental building');

  let lock: Lock | undefined;
  try {
    lock = await acquireRedisLock(`build-deps`, 60000);
    const startTime = performance.now();

    const buildResult = await analyzeDependencies();

    logger.info(
      `Found ${buildResult.allDeps.length} total dependencies, ${buildResult.depsToRebuild.length} need rebuilding`,
    );

    if (buildResult.depsToRebuild.length === 0) {
      logger.info('All dependencies are up to date, skipping build');
      return;
    }

    logger.info(
      `Building ${buildResult.depsToRebuild.length} changed dependencies out of ${buildResult.allDeps.length} total dependencies`,
    );

    await buildDependencies(buildResult, depBuildCache);

    const buildDuration = Math.floor(performance.now() - startTime);
    logger.info(
      `Finished building ${buildResult.depsToRebuild.length} dependencies in ${buildDuration}ms. Updating block metadata cache...`,
    );

    await linkBlocks(buildResult.blocksToRebuild, depBuildCache);

    const linkDuration = Math.floor(
      performance.now() - startTime - buildDuration,
    );
    logger.info(
      `Linked ${buildResult.blocksToRebuild.length} blocks in ${linkDuration}ms. Dependencies are ready.`,
    );

    // For any change in openops-common, only openops-common needs to be rebuild but the metadata cache still needs to be updated for all blocks
    await updateBlockMetadataCache(buildResult.blocks);

    saveBuildCache(depBuildCache);
  } finally {
    await lock?.release();
  }
}
