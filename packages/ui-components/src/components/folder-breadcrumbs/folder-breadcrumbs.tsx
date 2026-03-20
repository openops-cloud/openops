import { UNCATEGORIZED_FOLDER_ID } from '@openops/shared';
import { t } from 'i18next';
import { ChevronRight } from 'lucide-react';
import React from 'react';
import { FolderItem, getPathToRoot } from '../folder-tree';

type FolderBreadcrumbsProps = {
  selectedFolderId: string;
  folderItems: FolderItem[] | undefined;
};

const getPathTokens = (selectedFolderId: string, folderItems: FolderItem[]) => {
  if (selectedFolderId === UNCATEGORIZED_FOLDER_ID) {
    return [t('Uncategorized')];
  }

  return getPathToRoot(selectedFolderId, folderItems, 'displayName');
};

const FolderBreadcrumbs = ({
  selectedFolderId,
  folderItems,
}: FolderBreadcrumbsProps) => {
  if (!folderItems || folderItems.length === 0) {
    return null;
  }

  const pathTokens = getPathTokens(selectedFolderId, folderItems);

  return (
    pathTokens && (
      <div
        data-testid="folder-breadcrumbs"
        className="flex flex-wrap items-center gap-1 text-primary-300 dark:text-primary"
      >
        <span className="text-xl font-medium">{t('All workflows')}</span>
        {pathTokens.map((pathToken, idx) => (
          <React.Fragment key={pathToken + idx}>
            <ChevronRight className="h-7 w-7 text-foreground" />
            <span className="text-xl font-medium">{pathToken}</span>
          </React.Fragment>
        ))}
      </div>
    )
  );
};

export { FolderBreadcrumbs, FolderBreadcrumbsProps };
