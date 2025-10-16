import {
  BlockBase,
  BlockMetadataModel,
  BlockMetadataModelSummary,
} from '@openops/blocks-framework';
import {
  ApplicationError,
  assertNotNullOrUndefined,
  BlockType,
  ErrorCode,
  EXACT_VERSION_REGEX,
  isNil,
  ListVersionsResponse,
  openOpsId,
} from '@openops/shared';
import dayjs from 'dayjs';
import semVer from 'semver';
import { IsNull } from 'typeorm';
import { toBlockMetadataModelSummary } from '.';
import { repoFactory } from '../../core/db/repo-factory';
import { flagService } from '../../flags/flag.service';
import { projectService } from '../../project/project-service';
import {
  BlockMetadataEntity,
  BlockMetadataSchema,
} from '../block-metadata-entity';
import { BlockMetadataService } from './block-metadata-service';
import { localBlockCache } from './helper/local-block-cache';
import { blockMetadataServiceHooks } from './hooks';

const repo = repoFactory(BlockMetadataEntity);

export const FastDbBlockMetadataService = (): BlockMetadataService => {
  return {
    async listAll(): Promise<BlockBase[]> {
      const release = await flagService.getCurrentRelease();

      return (
        await findAllBlocksVersionsSortedByNameAscVersionDesc({
          release,
        })
      ).map((b) => ({
        name: b.name,
        version: b.version,
        displayName: b.displayName,
        description: b.description,
      }));
    },
    async list(params): Promise<BlockMetadataModelSummary[]> {
      const originalBlocks =
        await findAllBlocksVersionsSortedByNameAscVersionDesc(params);
      const uniqueBlocks = new Set<string>(
        originalBlocks.map((block) => block.name),
      );
      const latestVersionOfEachBlock = Array.from(uniqueBlocks).map((name) => {
        const result = originalBlocks.find((block) => block.name === name);
        const usageCount = originalBlocks
          .filter((block) => block.name === name)
          .reduce((acc, block) => {
            return acc + block.projectUsage;
          }, 0);
        assertNotNullOrUndefined(result, 'block_metadata_not_found');
        return {
          ...result,
          projectUsage: usageCount,
        };
      });

      const filteredBlocks = await blockMetadataServiceHooks
        .get()
        .filterBlocks({
          ...params,
          blocks: latestVersionOfEachBlock,
          suggestionType: params.suggestionType,
        });
      return toBlockMetadataModelSummary(
        filteredBlocks,
        latestVersionOfEachBlock,
        params.suggestionType,
      );
    },
    async get({
      projectId,
      version,
      name,
    }): Promise<BlockMetadataModel | undefined> {
      let organizationId: string | undefined = undefined;
      if (!isNil(projectId)) {
        // TODO: this might be database intensive, consider caching, passing organization id from caller cause major changes
        // Don't use GetOneOrThrow Anonymous Token generates random string for project id
        const project = await projectService.getOne(projectId);
        organizationId = project?.organizationId;
      }
      const versionToSearch = findNextExcludedVersion(version);

      const originalBlocks =
        await findAllBlocksVersionsSortedByNameAscVersionDesc({
          projectId,
          organizationId,
          release: undefined,
        });
      const block = originalBlocks.find((block) => {
        const strictlyLessThan =
          isNil(versionToSearch) ||
          (semVer.compare(block.version, versionToSearch.nextExcludedVersion) <
            0 &&
            semVer.compare(block.version, versionToSearch.baseVersion) >= 0);
        return (
          block.name.toLowerCase() === name.toLowerCase() && strictlyLessThan
        );
      });
      return block;
    },
    async getOrThrow({
      projectId,
      version,
      name,
    }): Promise<BlockMetadataModel> {
      const block = await this.get({ projectId, version, name });
      if (isNil(block)) {
        throw new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: {
            message: `block_metadata_not_found projectId=${projectId}`,
          },
        });
      }
      return block;
    },
    async getVersions({
      name,
      projectId,
      release,
      organizationId,
    }): Promise<ListVersionsResponse> {
      const blocks = await findAllBlocksVersionsSortedByNameAscVersionDesc({
        projectId,
        organizationId,
        release,
      });
      return blocks
        .filter((p) => p.name === name)
        .reverse()
        .reduce((record, blockMetadata) => {
          record[blockMetadata.version] = {};
          return record;
        }, {} as ListVersionsResponse);
    },
    async delete({ projectId, id }): Promise<void> {
      const existingMetadata = await repo().findOneBy({
        id,
        projectId: projectId ?? IsNull(),
      });
      if (isNil(existingMetadata)) {
        throw new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: {
            message: `block_metadata_not_found id=${id}`,
          },
        });
      }
      await repo().delete({
        id,
        projectId: projectId ?? IsNull(),
      });
    },
    async updateUsage({ id, usage }): Promise<void> {
      const existingMetadata = await repo().findOneByOrFail({
        id,
      });
      await repo().update(id, {
        projectUsage: usage,
        updated: existingMetadata.updated,
        created: existingMetadata.created,
      });
    },
    async getExactBlockVersion({ name, version, projectId }): Promise<string> {
      const isExactVersion = EXACT_VERSION_REGEX.test(version);

      if (isExactVersion) {
        return version;
      }

      const blockMetadata = await this.getOrThrow({
        projectId,
        name,
        version,
      });

      return blockMetadata.version;
    },
    async create({
      blockMetadata,
      projectId,
      organizationId,
      packageType,
      blockType,
      archiveId,
    }): Promise<BlockMetadataSchema> {
      const existingMetadata = await repo().findOneBy({
        name: blockMetadata.name,
        version: blockMetadata.version,
        projectId: projectId ?? IsNull(),
        organizationId: organizationId ?? IsNull(),
      });
      if (!isNil(existingMetadata)) {
        throw new ApplicationError({
          code: ErrorCode.VALIDATION,
          params: {
            message: `block_metadata_already_exists name=${blockMetadata.name} version=${blockMetadata.version} projectId=${projectId}`,
          },
        });
      }
      const createdDate = await findOldestCreataDate({
        name: blockMetadata.name,
        projectId,
        organizationId,
      });
      return repo().save({
        id: openOpsId(),
        projectId,
        packageType,
        blockType,
        archiveId,
        organizationId,
        created: createdDate,
        ...blockMetadata,
      });
    },
  };
};

const findOldestCreataDate = async ({
  name,
  projectId,
  organizationId,
}: {
  name: string;
  projectId: string | undefined;
  organizationId: string | undefined;
}): Promise<string> => {
  const block = await repo().findOne({
    where: {
      name,
      projectId: projectId ?? IsNull(),
      organizationId: organizationId ?? IsNull(),
    },
    order: {
      created: 'ASC',
    },
  });
  return block?.created ?? dayjs().toISOString();
};

const findNextExcludedVersion = (
  version: string | undefined,
): { baseVersion: string; nextExcludedVersion: string } | undefined => {
  if (version?.startsWith('^')) {
    const baseVersion = version.substring(1);
    return {
      baseVersion,
      nextExcludedVersion: increaseMajorVersion(baseVersion),
    };
  }
  if (version?.startsWith('~')) {
    const baseVersion = version.substring(1);
    return {
      baseVersion,
      nextExcludedVersion: increaseMinorVersion(baseVersion),
    };
  }
  if (isNil(version)) {
    return undefined;
  }
  return {
    baseVersion: version,
    nextExcludedVersion: increasePatchVersion(version),
  };
};

const increasePatchVersion = (version: string): string => {
  const incrementedVersion = semVer.inc(version, 'patch');
  if (isNil(incrementedVersion)) {
    throw new Error(`Failed to increase patch version ${version}`);
  }
  return incrementedVersion;
};

const increaseMinorVersion = (version: string): string => {
  const incrementedVersion = semVer.inc(version, 'minor');
  if (isNil(incrementedVersion)) {
    throw new Error(`Failed to increase minor version ${version}`);
  }
  return incrementedVersion;
};

const increaseMajorVersion = (version: string): string => {
  const incrementedVersion = semVer.inc(version, 'major');
  if (isNil(incrementedVersion)) {
    throw new Error(`Failed to increase major version ${version}`);
  }
  return incrementedVersion;
};

async function findAllBlocksVersionsSortedByNameAscVersionDesc({
  projectId,
  organizationId,
  release,
}: {
  projectId?: string;
  organizationId?: string;
  release: string | undefined;
}): Promise<BlockMetadataSchema[]> {
  const block = (await localBlockCache.getSortedbyNameAscThenVersionDesc())
    .filter((block) => {
      return (
        isOfficialBlock(block) ||
        isProjectBlock(projectId, block) ||
        isOrganizationBlock(organizationId, block)
      );
    })
    .filter((block) => isSupportedRelease(release, block));
  return block;
}

function isSupportedRelease(
  release: string | undefined,
  block: BlockMetadataSchema,
): boolean {
  if (isNil(release)) {
    return true;
  }
  if (
    !isNil(block.maximumSupportedRelease) &&
    semVer.compare(release, block.maximumSupportedRelease) == 1
  ) {
    return false;
  }
  if (
    !isNil(block.minimumSupportedRelease) &&
    semVer.compare(release, block.minimumSupportedRelease) == -1
  ) {
    return false;
  }
  return true;
}

function isOfficialBlock(block: BlockMetadataSchema): boolean {
  return (
    block.blockType === BlockType.OFFICIAL &&
    isNil(block.projectId) &&
    isNil(block.organizationId)
  );
}

function isProjectBlock(
  projectId: string | undefined,
  block: BlockMetadataSchema,
): boolean {
  if (isNil(projectId)) {
    return false;
  }
  return block.projectId === projectId && block.blockType === BlockType.CUSTOM;
}

function isOrganizationBlock(
  organizationId: string | undefined,
  block: BlockMetadataSchema,
): boolean {
  if (isNil(organizationId)) {
    return false;
  }
  return (
    block.organizationId === organizationId &&
    isNil(block.projectId) &&
    block.blockType === BlockType.CUSTOM
  );
}
