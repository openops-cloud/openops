import {
  ApplicationError,
  ContentType,
  CreateFolderRequest,
  Cursor,
  ErrorCode,
  Folder,
  FolderDto,
  FolderId,
  isNil,
  openOpsId,
  PopulatedFlow,
  ProjectId,
  UNCATEGORIZED_FOLDER_DISPLAY_NAME,
  UNCATEGORIZED_FOLDER_ID,
  UpdateFolderRequest,
} from '@openops/shared';
import { repoFactory } from '../../core/db/repo-factory';
import { flowService } from '../flow/flow.service';
import { getFolderFlows } from './folder-flows';
import { buildFolderTree, FolderWithFlows } from './folder-tree.utils';
import { FolderEntity, FolderSchema } from './folder.entity';
import { getUncategorizedFlows } from './uncategorized-flows';

export const folderRepo = repoFactory(FolderEntity);

export const flowFolderService = {
  async delete(params: DeleteParams): Promise<void> {
    const { projectId, folderId } = params;
    const folder = await this.getOneOrThrow({ projectId, folderId });
    await folderRepo().delete({
      id: folder.id,
      projectId,
    });
  },
  async update(params: UpdateParams): Promise<FolderDto> {
    const { projectId, folderId, request } = params;
    const folder = await this.getOneOrThrow({ projectId, folderId });
    const folderWithDisplayName = await this.getOneByDisplayNameCaseInsensitive(
      {
        projectId,
        displayName: request.displayName,
        contentType: folder.contentType,
      },
    );
    if (folderWithDisplayName && folderWithDisplayName.id !== folderId) {
      throw new ApplicationError({
        code: ErrorCode.VALIDATION,
        params: { message: 'Folder displayName is used' },
      });
    }

    const parentFolder = await flowFolderService.getParentFolder(
      projectId,
      request.parentFolderId,
    );

    if (parentFolder && parentFolder.contentType !== folder.contentType) {
      throw new ApplicationError({
        code: ErrorCode.VALIDATION,
        params: {
          message: 'Parent folder has different content type than the request',
        },
      });
    }

    await folderRepo().update(folder.id, {
      displayName: request.displayName,
      parentFolder,
    });

    return this.getOneOrThrow({ projectId, folderId });
  },
  async create(params: UpsertParams): Promise<FolderDto> {
    const { projectId, request } = params;
    const requestContentType = request.contentType ?? ContentType.WORKFLOW;
    const folderWithDisplayName = await this.getOneByDisplayNameCaseInsensitive(
      {
        projectId,
        displayName: request.displayName,
        contentType: requestContentType,
      },
    );
    if (!isNil(folderWithDisplayName)) {
      throw new ApplicationError({
        code: ErrorCode.FOLDER_ALREADY_EXISTS,
        params: { folderName: request.displayName },
      });
    }

    const folderId = openOpsId();
    const parentFolder = await flowFolderService.getParentFolder(
      projectId,
      request.parentFolderId,
    );

    await folderRepo().upsert(
      {
        id: folderId,
        projectId,
        parentFolder,
        displayName: request.displayName,
        contentType: requestContentType,
      },
      ['projectId', 'contentType', 'displayName'],
    );

    const folder = await folderRepo().findOneByOrFail({
      projectId,
      id: folderId,
    });

    return {
      ...folder,
      numberOfFlows: 0,
      flows: undefined,
      subfolders: undefined,
      parentFolderId: request.parentFolderId,
    };
  },
  async getParentFolder(
    projectId: string,
    parentFolderId?: string,
  ): Promise<FolderSchema | undefined> {
    if (!parentFolderId) {
      return undefined;
    }

    const folder = await folderRepo().findOneBy({
      projectId,
      id: parentFolderId,
    });

    if (!folder) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          message: `Folder ${parentFolderId} was not found`,
        },
      });
    }

    return folder;
  },
  async listFolderFlows(params: ListFolderFlowsParams): Promise<FolderDto[]> {
    const {
      projectId,
      includeUncategorizedFolder,
      contentType = ContentType.WORKFLOW,
    } = params;

    const folders = (await getFolderFlows(
      projectId,
      contentType,
    )) as FolderWithFlows[];

    return buildFolderTree(
      folders,
      includeUncategorizedFolder
        ? await flowFolderService.getUncategorizedFolder({
            projectId,
            contentType,
          })
        : undefined,
    );
  },
  async getUncategorizedFolder({
    projectId,
    contentType = ContentType.WORKFLOW,
  }: {
    projectId: string;
    contentType?: ContentType;
  }): Promise<FolderDto> {
    const uncategorizedFlows = await getUncategorizedFlows(
      projectId,
      contentType,
    );

    const uncategorizedFolderDto: FolderDto = {
      projectId,
      id: UNCATEGORIZED_FOLDER_ID,
      displayName: UNCATEGORIZED_FOLDER_DISPLAY_NAME,
      created: '',
      updated: '',
      numberOfFlows: uncategorizedFlows.length,
      flows: uncategorizedFlows.slice(0, 100).map((f) => ({
        id: f.id,
        displayName: (f as unknown as PopulatedFlow).version.displayName,
      })),
      subfolders: [],
      parentFolderId: undefined,
      contentType,
    };

    return uncategorizedFolderDto;
  },
  async getOneByDisplayNameCaseInsensitive(
    params: GetOneByDisplayNameParams,
  ): Promise<Folder | null> {
    const { projectId, displayName, contentType } = params;
    return folderRepo()
      .createQueryBuilder('folder')
      .where('folder.projectId = :projectId', { projectId })
      .andWhere('LOWER(folder.displayName) = LOWER(:displayName)', {
        displayName,
      })
      .andWhere('folder.contentType = :contentType', { contentType })
      .getOne();
  },
  async getOneOrThrow(params: GetOneOrThrowParams): Promise<FolderDto> {
    const { projectId, folderId } = params;
    const folder = await folderRepo().findOneBy({ projectId, id: folderId });
    if (!folder) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          message: `Folder ${folderId} is not found`,
        },
      });
    }
    const numberOfFlows = await flowService.count({ projectId, folderId });
    return {
      ...folder,
      numberOfFlows,
      parentFolderId: undefined,
      subfolders: undefined,
      flows: undefined,
    };
  },
};

type DeleteParams = {
  projectId: ProjectId;
  folderId: FolderId;
};

type UpdateParams = {
  projectId: ProjectId;
  folderId: FolderId;
  request: UpdateFolderRequest;
};

type UpsertParams = {
  projectId: ProjectId;
  request: CreateFolderRequest;
};

type ListParams = {
  projectId: ProjectId;
  cursorRequest: Cursor | null;
  limit: number;
};

type ListFolderFlowsParams = {
  projectId: ProjectId;
  includeUncategorizedFolder: boolean;
  contentType?: ContentType;
};

type GetOneByDisplayNameParams = {
  projectId: ProjectId;
  displayName: string;
  contentType: ContentType;
};

type GetOneOrThrowParams = {
  projectId: ProjectId;
  folderId: FolderId;
};
