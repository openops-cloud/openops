import { useQuery } from '@tanstack/react-query';

import { Folder, FolderDto, UNCATEGORIZED_FOLDER_ID } from '@openops/shared';

import { QueryKeys } from '@/app/constants/query-keys';
import { authenticationSession } from '@/app/lib/authentication-session';
import { useMemo } from 'react';
import { foldersApi } from './folders-api';
import { mapFolderDtoToFolderItem } from './folders-utils';

export const ALL_SELECTED = 'ALL_SELECTED';

export const foldersHooks = {
  useFolderItems: () => {
    const { data: foldersWithFlows, isLoading } = useQuery<FolderDto[]>({
      queryKey: [QueryKeys.foldersFlows, authenticationSession.getProjectId()],
      queryFn: () => foldersApi.listFlows({}),
    });

    const folderItems = useMemo(
      () => foldersWithFlows?.map(mapFolderDtoToFolderItem),
      [foldersWithFlows],
    );

    return {
      folderItems,
      isLoading,
    };
  },
  useFolder: (folderId: string) => {
    return useQuery<Folder>({
      queryKey: [QueryKeys.folder, folderId],
      queryFn: () => foldersApi.get(folderId),
      enabled:
        folderId !== UNCATEGORIZED_FOLDER_ID && folderId !== ALL_SELECTED,
    });
  },
};
