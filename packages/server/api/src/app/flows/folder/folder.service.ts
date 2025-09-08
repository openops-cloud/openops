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
import { flowRepo } from '../flow/flow.repo';
import { flowService } from '../flow/flow.service';
import { buildFolderTree, FolderWithFlows } from './folder-tree.utils';
import { FolderEntity, FolderSchema } from './folder.entity';

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

    await folderRepo().update(folder.id, {
      displayName: request.displayName,
      parentFolder,
    });

    return this.getOneOrThrow({ projectId, folderId });
  },
  async create(params: UpsertParams): Promise<FolderDto> {
    const { projectId, request } = params;
    const folderWithDisplayName = await this.getOneByDisplayNameCaseInsensitive(
      {
        projectId,
        displayName: request.displayName,
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
        contentType: request.contentType || ContentType.WORKFLOW,
      },
      ['projectId', 'displayName'],
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
    const { projectId, includeUncategorizedFolder, contentType } = params;
    const query = folderRepo()
      .createQueryBuilder('folder')
      .loadRelationCountAndMap('folder.numberOfFlows', 'folder.flows')
      .leftJoinAndSelect('folder.parentFolder', 'parentFolder')
      .leftJoinAndSelect(
        'folder.flows',
        'flows',
        `flows.id IN (
          SELECT f.id
          FROM flow f
          WHERE f."folderId" = folder.id
          ORDER BY f.updated DESC
          LIMIT 100
        )`,
      )
      .leftJoinAndMapOne(
        'flows.version',
        'flow_version',
        'flowVersion',
        `flowVersion.id IN (
          SELECT fv.id
          FROM (
            SELECT "id", "flowId", "created", "displayName"
            FROM flow_version
            WHERE "flowId" = flows.id
            ORDER BY created DESC
            LIMIT 1
          ) fv
        )`,
      )
      .where('folder.projectId = :projectId', { projectId })
      .andWhere('folder.contentType = :contentType', { contentType })
      .orderBy('folder."displayName"', 'ASC');

    const folders = (await query.getMany()) as FolderWithFlows[];

    return buildFolderTree(
      folders,
      includeUncategorizedFolder
        ? await flowFolderService.getUncategorizedFolder({ projectId })
        : undefined,
    );
  },
  async getUncategorizedFolder({
    projectId,
  }: {
    projectId: string;
  }): Promise<FolderDto> {
    const uncategorizedFlowsQuery = flowRepo()
      .createQueryBuilder('flow')
      .select(['flow.id', 'flow.projectId'])
      .leftJoinAndMapOne(
        'flow.version',
        'flow_version',
        'version',
        `version.flowId = flow.id
       AND version.id IN (
          SELECT fv.id
          FROM flow_version fv
          WHERE fv."flowId" = flow.id
          ORDER BY fv.created DESC
          LIMIT 1
      )`,
      )
      .addSelect(['version.displayName'])
      .where('flow.folderId IS NULL')
      .andWhere('flow.isInternal = :isInternal', { isInternal: false })
      .andWhere('flow.projectId = :projectId', { projectId })
      .orderBy('flow.updated', 'DESC');

    const uncategorizedFlows = await uncategorizedFlowsQuery.getMany();

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
      contentType: ContentType.WORKFLOW,
    };

    return uncategorizedFolderDto;
  },
  async getOneByDisplayNameCaseInsensitive(
    params: GetOneByDisplayNameParams,
  ): Promise<Folder | null> {
    const { projectId, displayName } = params;
    return folderRepo()
      .createQueryBuilder('folder')
      .where('folder.projectId = :projectId', { projectId })
      .andWhere('LOWER(folder.displayName) = LOWER(:displayName)', {
        displayName,
      })
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
};

type GetOneOrThrowParams = {
  projectId: ProjectId;
  folderId: FolderId;
};
