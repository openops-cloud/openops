import { blockFolderExclusionService } from './block-folder-exclusion-service';

export type BlockFolderExclusionService = {
  isBlockFolderExcluded: (folderPath: string) => boolean;
};

export const getAnalyticsAccessService = (): BlockFolderExclusionService => {
  return blockFolderExclusionService;
};
