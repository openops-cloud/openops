import {
  cacheHandler,
  enrichErrorContext,
  fileExists,
  logger,
  memoryLock,
  PackageInfo,
  packageManager,
  threadSafeMkdir,
} from '@openops/server-shared';
import {
  BlockPackage,
  getPackageArchivePathForBlock,
  isEmpty,
  PackageType,
  PrivateBlockPackage,
} from '@openops/shared';
import { writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { BlockManager, PACKAGE_ARCHIVE_PATH } from './block-manager';

enum CacheState {
  READY = 'READY',
  PENDING = 'PENDING',
}

export class RegistryBlockManager extends BlockManager {
  public override async install({
    projectPath,
    blocks,
  }: InstallParams): Promise<void> {
    try {
      if (isEmpty(blocks)) {
        return;
      }

      await packageManager.init({
        path: projectPath,
      });

      const uniqueBlocks = this.removeDuplicatedBlocks(blocks);
      logger.debug('Removed dupes from blocks', { projectPath, uniqueBlocks });

      await this.installDependencies({
        projectPath,
        blocks: uniqueBlocks,
      });
    } catch (error) {
      const contextKey = '[BlockManager#install]';
      const contextValue = { projectPath, blocks };

      const enrichedError = enrichErrorContext({
        error,
        key: contextKey,
        value: contextValue,
      });
      logger.error('Failed to install blocks', {
        error: enrichedError,
      });

      throw enrichedError;
    }
  }

  private async installDependencies({
    projectPath,
    blocks,
  }: InstallParams): Promise<void> {
    await this.savePackageArchivesToDiskIfNotCached(blocks);

    const dependenciesToInstall = await this.filterExistingBlocks(
      projectPath,
      blocks,
    );
    if (dependenciesToInstall.length === 0) {
      return;
    }
    const pnpmAddLock = await memoryLock.acquire(`pnpm-add-${projectPath}`);

    const cache = cacheHandler(projectPath);

    try {
      const dependencies = await this.filterExistingBlocks(projectPath, blocks);
      if (dependencies.length === 0) {
        return;
      }
      await packageManager.add({ path: projectPath, dependencies });

      await Promise.all(
        dependencies.map((pkg) => cache.setCache(pkg.alias, CacheState.READY)),
      );
    } finally {
      await pnpmAddLock.release();
    }
  }

  private async savePackageArchivesToDiskIfNotCached(
    blocks: BlockPackage[],
  ): Promise<void> {
    const packages = await this.getUncachedArchivePackages(blocks);
    const saveToDiskJobs = packages.map((block) =>
      this.getArchiveAndSaveToDisk(block),
    );
    await Promise.all(saveToDiskJobs);
  }

  private async getUncachedArchivePackages(
    blocks: BlockPackage[],
  ): Promise<PrivateBlockPackage[]> {
    const packages: PrivateBlockPackage[] = [];

    for (const block of blocks) {
      if (block.packageType !== PackageType.ARCHIVE) {
        continue;
      }

      const archivePath = getPackageArchivePathForBlock({
        archiveId: block.archiveId,
        archivePath: PACKAGE_ARCHIVE_PATH,
      });

      if (await fileExists(archivePath)) {
        continue;
      }

      packages.push(block);
    }

    return packages;
  }

  private async getArchiveAndSaveToDisk(
    block: PrivateBlockPackage,
  ): Promise<void> {
    const archiveId = block.archiveId;

    const archivePath = getPackageArchivePathForBlock({
      archiveId,
      archivePath: PACKAGE_ARCHIVE_PATH,
    });

    await threadSafeMkdir(dirname(archivePath));

    await writeFile(archivePath, block.archive as Buffer);
  }

  private async filterExistingBlocks(
    projectPath: string,
    blocks: BlockPackage[],
  ): Promise<PackageInfo[]> {
    const cache = cacheHandler(projectPath);
    const enrichedDependencies = await Promise.all(
      blocks.map(async (block) => {
        const pkg = this.blockToDependency(block);
        const fState = await cache.cacheCheckState(pkg.alias);
        return { pkg, fExists: fState === CacheState.READY };
      }),
    );
    return enrichedDependencies
      .filter(({ fExists }) => !fExists)
      .map(({ pkg }) => pkg);
  }

  private removeDuplicatedBlocks(blocks: BlockPackage[]): BlockPackage[] {
    return blocks.filter(
      (block, index, self) =>
        index ===
        self.findIndex(
          (p) =>
            p.blockName === block.blockName &&
            p.blockVersion === block.blockVersion,
        ),
    );
  }
}

type InstallParams = {
  projectPath: string;
  blocks: BlockPackage[];
};
