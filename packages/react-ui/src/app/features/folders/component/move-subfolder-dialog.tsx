import { FolderItem } from '@openops/components/ui';
import { Folder, UNCATEGORIZED_FOLDER_ID } from '@openops/shared';
import { MutationFunction } from '@tanstack/react-query';
import { foldersApi } from '../lib/folders-api';
import { getAllChildFolderItems } from '../lib/folders-utils';
import {
  MoveToFolderDialog,
  MoveToFolderDialogProps,
  MoveToFolderFormSchema,
} from './move-to-folder-dialog';

interface MoveSubfolderDialogProps extends Pick<
  MoveToFolderDialogProps<Folder>,
  'children' | 'onMoveTo'
> {
  folder: FolderItem;
}

const MoveSubfolderDialog = ({
  folder,
  children,
  ...props
}: MoveSubfolderDialogProps) => {
  const apiMutateFn: MutationFunction<Folder, MoveToFolderFormSchema> = async (
    data,
  ) => {
    return await foldersApi.updateFolder(folder.id, {
      displayName: folder.displayName,
      parentFolderId: data.folder,
    });
  };

  return (
    <MoveToFolderDialog
      excludeFolderIds={getExcludedFolderIds(folder)}
      apiMutateFn={apiMutateFn}
      displayName={folder.displayName}
      {...props}
    >
      {children}
    </MoveToFolderDialog>
  );
};

const getExcludedFolderIds = (folder: FolderItem) => {
  const excluded = [folder.id, UNCATEGORIZED_FOLDER_ID];

  if (folder.parentFolderId) {
    excluded.push(folder.parentFolderId);
  }

  const childFolderIds = getAllChildFolderItems(folder).map((f) => f.id);

  return excluded.concat(childFolderIds);
};

MoveSubfolderDialog.displayName = 'MoveSubfolderDialog';

export { MoveSubfolderDialog, MoveSubfolderDialogProps };
