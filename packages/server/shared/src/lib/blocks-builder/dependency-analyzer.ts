import { readdir, readFile, stat } from 'node:fs/promises';
import { cwd } from 'node:process';
import { join } from 'path';
import { logger } from '../logger';
import { DependencyBuildInfo } from './types';

const LOG_FIRST_BLOCKS = 3;

let depBuildCache: Map<string, number> = new Map();

export function setDependencyCache(cache: Map<string, number>): void {
  depBuildCache = cache;
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

export async function getSharedInfo(): Promise<DependencyBuildInfo | null> {
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

export async function getServerSharedInfo(): Promise<DependencyBuildInfo | null> {
  const serverSharedPath = join(cwd(), 'packages', 'server', 'shared');
  const packageJsonPath = join(serverSharedPath, 'package.json');

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

    if (packageJson.name === '@openops/server-shared') {
      const lastModified = await getDirectoryLastModified(serverSharedPath);
      const cached = depBuildCache.get(packageJson.name) ?? 0;
      const needsRebuild = lastModified > cached;

      logger.debug(
        `Server Shared: lastModified=${lastModified}, cached=${cached}, needsRebuild=${needsRebuild}`,
      );

      return {
        name: packageJson.name,
        path: serverSharedPath,
        lastModified,
        needsRebuild,
        type: 'server-shared',
      };
    }
  } catch (error) {
    logger.warn('Error checking server-shared package', { error });
  }

  return null;
}

export async function getOpenOpsCommonInfo(): Promise<DependencyBuildInfo | null> {
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

export async function getBlocksWithChanges(): Promise<DependencyBuildInfo[]> {
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
