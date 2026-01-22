import { BlockFolderExclusionService } from './block-folder-exclusion-factory';

export const blockFolderExclusionService: BlockFolderExclusionService = {
  isFolderExcluded: (folderName: string) => {
    return (
      folderName === 'node_modules' ||
      folderName === 'dist' ||
      folderName === 'framework' ||
      folderName === 'common'
    );
  },
};
