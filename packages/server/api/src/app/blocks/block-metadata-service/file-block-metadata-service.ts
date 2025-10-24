import {
  BlockBase,
  BlockMetadata,
  BlockMetadataModel,
  BlockMetadataModelSummary,
} from '@openops/blocks-framework';
import { fileBlocksUtils } from '@openops/server-shared';
import {
  ApplicationError,
  BlockType,
  ErrorCode,
  EXACT_VERSION_REGEX,
  isNil,
  ListVersionsResponse,
  PackageType,
  ProjectId,
} from '@openops/shared';
import { nanoid } from 'nanoid';
import { toBlockMetadataModelSummary } from '.';
import { BlockMetadataSchema } from '../block-metadata-entity';
import { BlockMetadataService } from './block-metadata-service';
import { blockMetadataServiceHooks } from './hooks';

const loadBlocksMetadata = async (): Promise<BlockMetadata[]> => {
  const blocks = await fileBlocksUtils.findAllBlocks();
  return blocks.sort((a, b) =>
    a.displayName.toUpperCase().localeCompare(b.displayName.toUpperCase()),
  );
};
export const FileBlockMetadataService = (): BlockMetadataService => {
  return {
    async listAll(): Promise<BlockBase[]> {
      return (await loadBlocksMetadata()).map((p) => {
        return {
          name: p.name,
          version: p.version,
          displayName: p.displayName,
          description: p.description,
        };
      });
    },
    async list(params): Promise<BlockMetadataModelSummary[]> {
      const { projectId } = params;
      const originalBlocksMetadata: BlockMetadataSchema[] = (
        await loadBlocksMetadata()
      ).map((p) => {
        return {
          id: nanoid(),
          ...p,
          projectUsage: 0,
          blockType: BlockType.OFFICIAL,
          packageType: PackageType.REGISTRY,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };
      });

      const blocks = await blockMetadataServiceHooks.get().filterBlocks({
        ...params,
        blocks: originalBlocksMetadata,
        suggestionType: params.suggestionType,
      });
      const filteredBlocks = blocks.map((p) =>
        toBlockMetadataModel({
          blockMetadata: p,
          projectId,
        }),
      );
      return toBlockMetadataModelSummary(
        filteredBlocks,
        originalBlocksMetadata,
        params.suggestionType,
      );
    },
    async updateUsage() {
      throw new Error('Updating blocks is not supported in development mode');
    },
    async getVersions(params): Promise<ListVersionsResponse> {
      const blocksMetadata = await loadBlocksMetadata();
      const blockMetadata = blocksMetadata.find((p) => p.name === params.name);
      return blockMetadata?.version ? { [blockMetadata.version]: {} } : {};
    },
    async get({ name, projectId }): Promise<BlockMetadataModel | undefined> {
      const blocksMetadata = await loadBlocksMetadata();
      const blockMetadata = blocksMetadata.find(
        (p) => p.name.toLowerCase() === name.toLowerCase(),
      );

      if (isNil(blockMetadata)) {
        return undefined;
      }

      return toBlockMetadataModel({
        blockMetadata,
        projectId,
      });
    },
    async getOrThrow({
      name,
      version,
      projectId,
    }): Promise<BlockMetadataModel> {
      const blockMetadata = await this.get({
        name,
        version,
        projectId,
      });

      if (isNil(blockMetadata)) {
        throw new ApplicationError({
          code: ErrorCode.BLOCK_NOT_FOUND,
          params: {
            blockName: name,
            blockVersion: version,
            message: 'Blocks is not found in file system',
          },
        });
      }

      return toBlockMetadataModel({
        blockMetadata,
        projectId,
      });
    },

    async delete(): Promise<void> {
      throw new Error('Deleting blocks is not supported in development mode');
    },

    async create(): Promise<BlockMetadataModel> {
      throw new Error('Creating blocks is not supported in development mode');
    },

    async getExactBlockVersion({ projectId, name, version }): Promise<string> {
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
  };
};

const toBlockMetadataModel = ({
  blockMetadata,
  projectId,
}: ToBlockMetadataModelParams): BlockMetadataModel => {
  return {
    name: blockMetadata.name,
    displayName: blockMetadata.displayName,
    description: blockMetadata.description,
    logoUrl: blockMetadata.logoUrl,
    displayIcon: blockMetadata.displayIcon,
    version: blockMetadata.version,
    auth: blockMetadata.auth,
    projectUsage: 0,
    minimumSupportedRelease: blockMetadata.minimumSupportedRelease,
    maximumSupportedRelease: blockMetadata.maximumSupportedRelease,
    actions: blockMetadata.actions,
    authors: blockMetadata.authors,
    categories: blockMetadata.categories,
    triggers: blockMetadata.triggers,
    directoryPath: blockMetadata.directoryPath,
    projectId,
    packageType: PackageType.REGISTRY,
    blockType: BlockType.OFFICIAL,
  };
};

type ToBlockMetadataModelParams = {
  blockMetadata: BlockMetadata;
  projectId?: ProjectId;
};
