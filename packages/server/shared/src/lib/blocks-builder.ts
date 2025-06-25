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
import { BuildResult } from './blocks-builder/types';
import { acquireRedisLock } from './cache/redis-lock';
import { logger } from './logger';
import { Lock } from './memory-lock';
import { SharedSystemProp, system } from './system';

const isFileBlocks =
  system.getOrThrow(SharedSystemProp.BLOCKS_SOURCE) === 'FILE';
const isDevEnv = system.getOrThrow(SharedSystemProp.ENVIRONMENT) === 'dev';

const depBuildCache = loadBuildCache();

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
    allDeps,
    depsToRebuild,
    blocksToRebuild,
    openopsToRebuild,
    sharedToRebuild,
    serverSharedToRebuild,
  };
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
      `Finished building ${buildResult.depsToRebuild.length} dependencies in ${buildDuration}ms. Linking blocks...`,
    );

    await linkBlocks(buildResult.blocksToRebuild, depBuildCache);

    const linkDuration = Math.floor(
      performance.now() - startTime - buildDuration,
    );
    logger.info(
      `Linked ${buildResult.blocksToRebuild.length} blocks in ${linkDuration}ms. Dependencies are ready.`,
    );

    saveBuildCache(depBuildCache);
  } finally {
    await lock?.release();
  }
}
