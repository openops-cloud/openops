import { BlockFolderExclusionService } from './block-folder-exclusion-factory';

export const blockFolderExclusionService: BlockFolderExclusionService = {
  isFolderExcluded: (folderPath: string) => {
    return (
      folderPath === 'node_modules' ||
      folderPath === 'dist' ||
      folderPath === 'framework' ||
      folderPath === 'common'
    );
  },
};
