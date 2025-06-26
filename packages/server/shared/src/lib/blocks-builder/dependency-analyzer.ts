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

// TODO: Parse project.json and check if targets.build.executor === 'nx:noop'
const BLOCKS_TO_IGNORE = ['@openops/block-sftp'];

async function getPackageInfo(
  packagePath: string,
  packageType: 'block' | 'openops-common' | 'shared' | 'server-shared',
  logPrefix?: string,
): Promise<DependencyBuildInfo | null> {
  const packageJsonPath = join(packagePath, 'package.json');

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

    if (
      packageType === 'block' &&
      BLOCKS_TO_IGNORE.includes(packageJson.name)
    ) {
      return null;
    }

    const lastModified = await getDirectoryLastModified(packagePath);
    const cached = depBuildCache.get(packageJson.name) ?? 0;
    const needsRebuild = lastModified > cached;

    const displayName =
      logPrefix ?? packageType.charAt(0).toUpperCase() + packageType.slice(1);
    logger.debug(
      `${displayName} ${packageJson.name}: lastModified=${lastModified}, cached=${cached}, needsRebuild=${needsRebuild}`,
    );

    return {
      name: packageJson.name,
      path: packagePath,
      lastModified,
      needsRebuild,
      type: packageType,
    };
  } catch (error) {
    logger.warn(`Error checking package at ${packageJsonPath}`, { error });
  }

  return null;
}

export async function getSharedInfo(): Promise<DependencyBuildInfo | null> {
  const sharedPath = join(cwd(), 'packages', 'shared');
  return getPackageInfo(sharedPath, 'shared', 'Shared');
}

export async function getServerSharedInfo(): Promise<DependencyBuildInfo | null> {
  const serverSharedPath = join(cwd(), 'packages', 'server', 'shared');
  return getPackageInfo(serverSharedPath, 'server-shared', 'Server Shared');
}

export async function getOpenOpsCommonInfo(): Promise<DependencyBuildInfo | null> {
  const openopsPath = join(cwd(), 'packages', 'openops');
  return getPackageInfo(openopsPath, 'openops-common', 'OpenOps Common');
}

export async function getBlocksWithChanges(): Promise<DependencyBuildInfo[]> {
  const blocksPath = join(cwd(), 'packages', 'blocks');
  const blocks: DependencyBuildInfo[] = [];

  const entries = await readdir(blocksPath, { withFileTypes: true });

  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      !['node_modules', 'dist', 'framework', 'common'].includes(entry.name)
    ) {
      const fullPath = join(blocksPath, entry.name);
      const packageJsonPath = join(fullPath, 'package.json');

      try {
        const packageJson = JSON.parse(
          await readFile(packageJsonPath, 'utf-8'),
        );
        if (!packageJson.name?.startsWith('@openops/block-')) {
          continue;
        }

        const blockInfo = await getPackageInfo(fullPath, 'block');
        if (!blockInfo) {
          continue;
        }

        if (blocks.length < LOG_FIRST_BLOCKS) {
          logger.debug(
            `Block ${packageJson.name}: lastModified=${
              blockInfo.lastModified
            }, cached=${
              depBuildCache.get(packageJson.name) ?? 0
            }, needsRebuild=${blockInfo.needsRebuild}`,
          );
        }
        blocks.push(blockInfo);
      } catch (err) {
        logger.warn(`Error checking package at ${packageJsonPath}`, { err });
      }
    }
  }

  return blocks;
}
