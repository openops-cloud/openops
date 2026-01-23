import { blockFolderExclusionService } from './block-folder-exclusion-service';

export type BlockFolderExclusionService = {
  isFolderExcluded: (folderName: string) => boolean;
};

export const getBlockFolderExclusionService =
  (): BlockFolderExclusionService => {
    return blockFolderExclusionService;
  };
