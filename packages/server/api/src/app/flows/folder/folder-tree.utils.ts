import { FolderDto, PopulatedFlow } from '@openops/shared';
import { FolderSchema } from './folder.entity';

export type FolderWithFlows = FolderSchema & {
  numberOfFlows?: number;
  flows?: PopulatedFlow[];
};

export const buildFolderTree = (
  folders: FolderWithFlows[],
  uncategorizedFolder?: FolderDto,
): FolderDto[] => {
  const folderMap = new Map<string, FolderDto>();
  const rootFolders: FolderDto[] = uncategorizedFolder
    ? [uncategorizedFolder]
    : [];

  folders.forEach((folder) => {
    const folderDto: FolderDto = {
      id: folder.id,
      projectId: folder.projectId,
      created: folder.created,
      updated: folder.updated,
      displayName: folder.displayName,
      numberOfFlows: folder.numberOfFlows || 0,
      flows:
        folder.flows?.map((f: PopulatedFlow) => ({
          id: f.id,
          displayName: f.version.displayName,
        })) || [],
      subfolders: [],
      parentFolderId: folder.parentFolder?.id,
      contentType: folder.contentType,
    };
    folderMap.set(folder.id, folderDto);
  });

  folders.forEach((folder) => {
    const folderDto = folderMap.get(folder.id);

    if (folder.parentFolder) {
      const parentFolder = folderMap.get(folder.parentFolder.id);
      if (parentFolder && folderDto && Array.isArray(parentFolder.subfolders)) {
        parentFolder.subfolders.push(folderDto);
      }
    } else if (folderDto) {
      rootFolders.push(folderDto);
    }
  });

  return rootFolders;
};
