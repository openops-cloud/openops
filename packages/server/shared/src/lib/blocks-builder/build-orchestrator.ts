import { stat } from 'node:fs/promises';
import { cwd } from 'node:process';
import { join } from 'path';
import { execAsync } from '../exec-async';
import { logger } from '../logger';
import { BuildResult, DependencyBuildInfo } from './types';

export async function buildDependencies(
  buildResult: BuildResult,
  depBuildCache: Map<string, number>,
): Promise<void> {
  const {
    sharedToRebuild,
    serverSharedToRebuild,
    openopsToRebuild,
    blocksToRebuild,
  } = buildResult;

  // Build shared first (most foundational)
  if (sharedToRebuild.length > 0) {
    logger.info('Building shared...');
    await execAsync('nx run shared:build');

    for (const dep of sharedToRebuild) {
      depBuildCache.set(dep.name, dep.lastModified);
    }
  }

  // Build server-shared second (depends on shared)
  if (serverSharedToRebuild.length > 0) {
    logger.info('Building server-shared...');
    await execAsync('nx run server-shared:build');

    for (const dep of serverSharedToRebuild) {
      depBuildCache.set(dep.name, dep.lastModified);
    }
  }

  // Build openops-common third (depends on shared and server-shared, blocks depend on it)
  if (openopsToRebuild.length > 0) {
    logger.info('Building openops-common...');
    await execAsync('nx run openops-common:build');

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
}

export async function linkBlocks(
  blocksToRebuild: DependencyBuildInfo[],
  depBuildCache: Map<string, number>,
): Promise<void> {
  for (const block of blocksToRebuild) {
    const blockFolderName = block.path.split('/').pop();
    if (!blockFolderName) {
      logger.warn(`Could not extract folder name from path: ${block.path}`);
      continue;
    }

    const distPath = join(cwd(), 'dist', 'packages', 'blocks', blockFolderName);

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
}
