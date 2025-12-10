import { encryptUtils, rejectedPromiseHandler } from '@openops/server-shared';
import {
  ApplicationError,
  assertNotNullOrUndefined,
  ErrorCode,
  isNil,
  openOpsId,
  OpenOpsId,
  Project,
  ProjectId,
  spreadIfDefined,
  User,
  UserId,
} from '@openops/shared';
import { IsNull } from 'typeorm';
import { repoFactory } from '../core/db/repo-factory';
import { ProjectEntity } from './project-entity';
import { projectHooks } from './project-hooks';

export const projectRepo = repoFactory(ProjectEntity);

export const projectService = {
  async create(params: CreateParams): Promise<Project> {
    const encryptTablesToken = encryptUtils.encryptString(
      params.tablesDatabaseToken,
    );
    const newProject: NewProject = {
      id: openOpsId(),
      ...params,
      tablesDatabaseToken: encryptTablesToken,
    };

    const savedProject = await projectRepo().save(newProject);

    rejectedPromiseHandler(projectHooks.getHooks().postCreate(savedProject));
    return savedProject;
  },

  async getOne(projectId: ProjectId | undefined): Promise<Project | null> {
    if (isNil(projectId)) {
      return null;
    }

    return projectRepo().findOneBy({
      id: projectId,
      deleted: IsNull(),
    });
  },

  async update(projectId: ProjectId, request: UpdateParams): Promise<Project> {
    await projectRepo().update(
      {
        id: projectId,
        deleted: IsNull(),
      },
      {
        ...spreadIfDefined('displayName', request.displayName),
        ...spreadIfDefined('ownerId', request.ownerId),
        ...spreadIfDefined('tablesDatabaseId', request.tablesDatabaseId),
        ...spreadIfDefined('tablesWorkspaceId', request.tablesWorkspaceId),
      },
    );
    return this.getOneOrThrow(projectId);
  },

  async getOrganizationId(projectId: ProjectId): Promise<string> {
    const result = await projectRepo()
      .createQueryBuilder('project')
      .select('"organizationId"')
      .where({
        id: projectId,
      })
      .getRawOne();
    const organizationId = result?.organizationId;
    assertNotNullOrUndefined(
      organizationId,
      'organizationId for project is undefined in webhook',
    );
    return organizationId;
  },

  async getProjectIdsByOrganizationId(
    organizationId: string,
  ): Promise<ProjectId[]> {
    const projects = await projectRepo().find({
      select: ['id'],
      where: { organizationId, deleted: IsNull() },
    });

    return projects.map((project) => project.id);
  },

  async getOneOrThrow(projectId: ProjectId): Promise<Project> {
    const project = await this.getOne(projectId);

    if (isNil(project)) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          entityId: projectId,
          entityType: 'project',
        },
      });
    }

    return project;
  },

  async getOneForUser(user: User): Promise<Project | null> {
    assertNotNullOrUndefined(user.organizationId, 'user.organizationId');
    return projectRepo().findOneBy({
      organizationId: user.organizationId,
      deleted: IsNull(),
    });
  },

  async getUserProjectOrThrow(ownerId: UserId): Promise<Project> {
    const project = await projectRepo().findOneBy({
      ownerId,
      deleted: IsNull(),
    });

    if (isNil(project)) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          entityType: 'project',
          message: `userId=${ownerId}`,
        },
      });
    }

    return project;
  },

  async addProjectToOrganization({
    projectId,
    organizationId,
  }: AddProjectToOrganizationParams): Promise<void> {
    const query = {
      id: projectId,
      deleted: IsNull(),
    };

    const update = {
      organizationId,
    };

    await projectRepo().update(query, update);
  },
};

type UpdateParams = {
  displayName?: string;
  ownerId?: UserId;
  tablesDatabaseId?: number;
  tablesWorkspaceId?: number;
};

type CreateParams = {
  ownerId: UserId;
  displayName: string;
  organizationId: string;
  externalId?: string;
  tablesDatabaseId: number;
  tablesWorkspaceId: number;
  tablesDatabaseToken: string;
};

type AddProjectToOrganizationParams = {
  projectId: ProjectId;
  organizationId: OpenOpsId;
};

type NewProject = Omit<Project, 'created' | 'updated' | 'deleted'>;
