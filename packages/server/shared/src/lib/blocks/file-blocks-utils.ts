import { Block, BlockMetadata } from '@openops/blocks-framework';
import { extractBlockFromModule, OpsEdition } from '@openops/shared';
import * as fs from 'fs/promises';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';
import { cacheWrapper } from '../cache/cache-wrapper';
import { exceptionHandler } from '../exception-handler';
import { logger } from '../logger';
import { memoryLock } from '../memory-lock';
import { system } from '../system/system';
import { SharedSystemProp } from '../system/system-prop';

const blocksHotReloadEnabled =
  system.getBoolean(SharedSystemProp.BLOCKS_HOT_RELOAD_ENABLED) ?? false;

async function findAllBlocksFolder(folderPath: string): Promise<string[]> {
  const paths = [];
  const files = await readdir(folderPath);

  for (const file of files) {
    const filePath = join(folderPath, file);
    const fileStats = await stat(filePath);
    if (
      fileStats.isDirectory() &&
      file !== 'node_modules' &&
      file !== 'dist' &&
      file !== 'framework' &&
      file !== 'common'
    ) {
      paths.push(...(await findAllBlocksFolder(filePath)));
    } else if (file === 'package.json') {
      paths.push(folderPath);
    }
  }
  return paths;
}

async function findDirectoryByPackageName(
  packageName: string,
): Promise<string | null> {
  const paths = await findAllBlocksFolder(
    resolve(cwd(), 'dist', 'packages', 'blocks'),
  );
  for (const path of paths) {
    try {
      const packageJson = await readFile(
        join(path, 'package.json'),
        'utf-8',
      ).then(JSON.parse);
      if (packageJson.name === packageName) {
        return path;
      }
    } catch (e) {
      logger.error(
        {
          name: 'findDirectoryByPackageName',
          message: JSON.stringify(e),
        },
        'Error finding directory by package name',
      );
    }
  }
  return null;
}

async function findAllBlocksDirectoryInSource(): Promise<string[]> {
  const blocksPath = resolve(cwd(), 'packages', 'blocks');
  const paths = await findAllBlocksFolder(blocksPath);
  return [...paths];
}

async function findBlockDirectoryByFolderName(
  blockName: string,
): Promise<string | null> {
  const blocksPath = await findAllBlocksDirectoryInSource();
  const blockPath = blocksPath.find((p) => p.includes(blockName));
  return blockPath ?? null;
}

async function findAllBlocks(): Promise<BlockMetadata[]> {
  const blocks = await loadBlocksFromFolder(
    resolve(cwd(), 'dist', 'packages', 'blocks'),
  );
  const enterpriseBlocks =
    system.getEdition() === OpsEdition.ENTERPRISE
      ? await loadBlocksFromFolder(
          resolve(cwd(), 'dist', 'packages', 'ee', 'blocks'),
        )
      : [];
  return [...blocks, ...enterpriseBlocks];
}

async function loadBlocksFromFolder(
  folderPath: string,
): Promise<BlockMetadata[]> {
  try {
    if (blocksHotReloadEnabled) {
      await eval(
        'Object.keys(require.cache).forEach(x => delete require.cache[x])',
      );
    }
    const paths = await fileBlocksUtils.findAllBlocksFolder(folderPath);
    const blocks = await Promise.all(paths.map((p) => loadBlockFromFolder(p)));
    return blocks.filter((p): p is BlockMetadata => p !== null);
  } catch (e) {
    const err = e as Error;
    logger.warn({
      name: 'FileBlockMetadataService#loadBlocksFromFolder',
      message: err.message,
      stack: err.stack,
    });
    return [];
  }
}

async function loadBlockFromFolder(
  folderPath: string,
): Promise<BlockMetadata | null> {
  return loadBlockMetadataFromFolder(folderPath, {
    bypassCache: false,
  });
}

export async function loadBlockMetadataFromFolder(
  folderPath: string,
  options: {
    bypassCache?: boolean;
    cacheKey?: string;
  } = {},
): Promise<BlockMetadata | null> {
  const { bypassCache = false, cacheKey: providedCacheKey } = options;
  let lock = undefined;

  try {
    // Parse name and version from package.json
    const packageJsonPath = join(folderPath, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    const { name: blockName, version: blockVersion } = packageJson;

    // A combination of a random suffix and clearing the "require" cache is
    // needed for reloading blocks in dev mode
    const suffix = blocksHotReloadEnabled
      ? '?version=' + new Date().getTime()
      : '';
    const indexPath = join(folderPath, 'src', 'index.js') + suffix;
    const stats = await fs.stat(packageJsonPath); // Get file stats

    // We add the configuration hash to ensure that env var changes take effect (e.g. AWS_ENABLE_IMPLICIT_ROLE)
    const cacheKey =
      providedCacheKey ??
      `${blockName}-${blockVersion}-${stats.mtime.getTime()}-${system.calculateConfigurationHash()}`;

    if (!bypassCache) {
      let blockMetadata = await cacheWrapper.getSerializedObject<BlockMetadata>(
        cacheKey,
      );
      if (blockMetadata) {
        return blockMetadata;
      }

      lock = await memoryLock.acquire(`${cacheKey}`);

      blockMetadata = await cacheWrapper.getSerializedObject<BlockMetadata>(
        cacheKey,
      );
      if (blockMetadata) {
        return blockMetadata;
      }
    }

    logger.debug(`No file-metadata found in cache. Loading ${cacheKey}`);
    const module = await eval(`import('${indexPath}')`);

    const block = extractBlockFromModule<Block>({
      module,
      blockName,
      blockVersion,
    });

    const blockMetadata: BlockMetadata = {
      ...block.metadata(),
      name: blockName,
      version: blockVersion,
      authors: block.authors,
      directoryPath: folderPath,
    };

    await cacheWrapper.setSerializedObject<BlockMetadata>(
      cacheKey,
      blockMetadata,
    );

    return blockMetadata;
  } catch (ex) {
    logger.warn('Failed to load block from folder: ' + folderPath, {
      error: ex,
    });
    exceptionHandler.handle(ex);
  } finally {
    if (lock) {
      await lock.release();
    }
  }
  return null;
}

export const fileBlocksUtils = {
  findAllBlocksFolder,
  findDirectoryByPackageName,
  findBlockDirectoryByFolderName,
  findAllBlocks,
  findAllBlocksDirectoryInSource,
};
