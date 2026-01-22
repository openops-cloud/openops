import { blockFolderExclusionService } from './block-folder-exclusion-service';

export type BlockFolderExclusionService = {
  isFolderExcluded: (folderPath: string) => boolean;
};

export const getBlockFolderExclusionService =
  (): BlockFolderExclusionService => {
    return blockFolderExclusionService;
  };
