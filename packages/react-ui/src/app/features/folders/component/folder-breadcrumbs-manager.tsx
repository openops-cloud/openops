import { foldersHooks } from '@/app/features/folders/lib/folders-hooks';
import { FolderBreadcrumbs } from '@openops/components/ui';
import { useSelectedFolderId } from '../lib/selected-folder-hook';

const FlowsFolderBreadcrumbsManager = () => {
  const selectedFolderId = useSelectedFolderId();

  const { folderItems } = foldersHooks.useFolderItems();

  return (
    <FolderBreadcrumbs
      selectedFolderId={selectedFolderId}
      folderItems={folderItems}
    />
  );
};

FlowsFolderBreadcrumbsManager.displayName = 'FlowsFolderBreadcrumbsManager';
export { FlowsFolderBreadcrumbsManager };
