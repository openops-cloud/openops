import { BlockFolderExclusionService } from './block-folder-exclusion-factory';

export const blockFolderExclusionService: BlockFolderExclusionService = {
  isBlockFolderExcluded: (folderPath: string) => {
    return (
      folderPath === 'node_modules' ||
      folderPath === 'dist' ||
      folderPath === 'framework' ||
      folderPath === 'common'
    );
  },
};
