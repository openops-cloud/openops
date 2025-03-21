import { AppSystemProp, distributedLock, system } from '@openops/server-shared';
import {
  ApplicationError,
  CreateEmptyFlowRequest,
  Cursor,
  ErrorCode,
  Flow,
  flowHelper,
  FlowId,
  FlowOperationRequest,
  FlowOperationType,
  FlowStatus,
  FlowTemplateWithoutProjectInformation,
  FlowVersion,
  FlowVersionId,
  FlowVersionState,
  isNil,
  openOpsId,
  PopulatedFlow,
  ProjectId,
  SeekPage,
  Trigger,
  UNCATEGORIZED_FOLDER_ID,
  UserId,
} from '@openops/shared';
import { EntityManager, In, IsNull } from 'typeorm';
import { appConnectionService } from '../../app-connection/app-connection-service/app-connection-service';
import { transaction } from '../../core/db/transaction';
import { buildPaginator } from '../../helper/pagination/build-paginator';
import { paginationHelper } from '../../helper/pagination/pagination-utils';
import {
  sendWorkflowCreatedEvent,
  sendWorkflowCreatedFromTemplateEvent,
  sendWorkflowDeletedEvent,
  sendWorkflowExportedEvent,
  sendWorkflowUpdatedEvent,
} from '../../telemetry/event-models';
import {
  flowVersionRepo,
  flowVersionService,
} from '../flow-version/flow-version.service';
import { flowSideEffects } from './flow-service-side-effects';
import { FlowEntity } from './flow.entity';
import { flowRepo } from './flow.repo';

const TRIGGER_FAILURES_THRESHOLD = system.getNumberOrThrow(
  AppSystemProp.TRIGGER_FAILURES_THRESHOLD,
);

export const flowService = {
  async create(params: CreateParams): Promise<PopulatedFlow> {
    const result = await create(params);

    sendWorkflowCreatedEvent(params.userId, result.id, result.projectId);

    return result;
  },

  async createFromTemplate({
    projectId,
    userId,
    displayName,
    description,
    trigger,
    templateId,
    connectionIds,
    isSample,
  }: CreateFromTemplateParams): Promise<PopulatedFlow> {
    const newFlow = await create({
      userId,
      projectId,
      request: {
        projectId,
        displayName,
      },
    });

    const connectionsList = connectionIds.length
      ? await appConnectionService.listActiveConnectionsByIds(
          projectId,
          connectionIds,
        )
      : [];

    const updatedFlow = await update({
      id: newFlow.id,
      userId,
      projectId,
      operation: {
        type: FlowOperationType.IMPORT_FLOW,
        request: {
          displayName,
          description,
          trigger,
          connections: connectionsList,
        },
      },
    });

    sendWorkflowCreatedFromTemplateEvent(
      userId,
      updatedFlow.id,
      updatedFlow.projectId,
      templateId,
      displayName,
      isSample,
    );

    return updatedFlow;
  },

  async list({
    projectId,
    cursorRequest,
    limit,
    folderId,
    status,
    name,
    versionState,
  }: ListParams): Promise<SeekPage<PopulatedFlow>> {
    const decodedCursor = paginationHelper.decodeCursor(cursorRequest);

    const paginator = buildPaginator({
      entity: FlowEntity,
      query: {
        limit,
        order: 'DESC',
        afterCursor: decodedCursor.nextCursor,
        beforeCursor: decodedCursor.previousCursor,
      },
    });

    const queryWhere: Record<string, unknown> = { projectId };

    if (folderId !== undefined) {
      queryWhere.folderId =
        folderId === UNCATEGORIZED_FOLDER_ID ? IsNull() : folderId;
    }

    if (status !== undefined) {
      queryWhere.status = In(status);
    }

    let query = flowRepo()
      .createQueryBuilder('flow')
      .where(queryWhere)
      .innerJoinAndSelect(
        'flow.versions',
        'fv',
        'fv.id IN (' +
          flowVersionRepo()
            .createQueryBuilder()
            .select('subFv.id')
            .from('flow_version', 'subFv')
            .where('subFv.flowId = flow.id')
            .orderBy('subFv.created', 'DESC')
            .limit(1)
            .getQuery() +
          ')',
      )
      .orderBy('fv.updated', 'DESC');

    if (name) {
      query = query.andWhere('fv.displayName ILIKE :namePattern', {
        namePattern: `%${name}%`,
      });
    }

    if (versionState) {
      query = query.andWhere('fv.state IN (:...versionStates)', {
        versionStates: versionState,
      });
    }

    const paginationResult = await paginator.paginate(query);

    const populatedFlowPromises = paginationResult.data.map(async (flow) => {
      return {
        ...flow,
        version: flow.versions[0],
      };
    });

    const populatedFlows = await Promise.all(populatedFlowPromises);

    return paginationHelper.createPage(populatedFlows, paginationResult.cursor);
  },

  async getOneById(id: string): Promise<Flow | null> {
    return flowRepo().findOneBy({
      id,
    });
  },
  async getOne({
    id,
    projectId,
    entityManager,
  }: GetOneParams): Promise<Flow | null> {
    return flowRepo(entityManager).findOneBy({
      id,
      projectId,
    });
  },

  async getOneOrThrow(params: GetOneParams): Promise<Flow> {
    const flow = await this.getOne(params);
    assertFlowIsNotNull(flow);
    return flow;
  },

  async getOnePopulated({
    id,
    projectId,
    versionId,
    removeConnectionsName = false,
    removeSampleData = false,
    entityManager,
  }: GetOnePopulatedParams): Promise<PopulatedFlow | null> {
    const flow = await flowRepo(entityManager).findOneBy({
      id,
      projectId,
    });

    if (isNil(flow)) {
      return null;
    }

    const flowVersion = await flowVersionService.getFlowVersionOrThrow({
      flowId: id,
      versionId,
      removeConnectionsName,
      removeSampleData,
      entityManager,
    });

    return {
      ...flow,
      version: flowVersion,
    };
  },

  async getOnePopulatedOrThrow({
    id,
    projectId,
    versionId,
    removeConnectionsName = false,
    removeSampleData = false,
    entityManager,
  }: GetOnePopulatedParams): Promise<PopulatedFlow> {
    const flow = await this.getOnePopulated({
      id,
      projectId,
      versionId,
      removeConnectionsName,
      removeSampleData,
      entityManager,
    });
    assertFlowIsNotNull(flow);
    return flow;
  },

  async update(params: UpdateParams): Promise<PopulatedFlow> {
    const result = await update(params);

    sendWorkflowUpdatedEvent({
      id: result.id,
      userId: params.userId,
      projectId: result.projectId,
      operation: params.operation,
      flowVersionId: result.version.id,
    });

    return result;
  },

  async updateStatus({
    id,
    projectId,
    newStatus,
    entityManager,
  }: UpdateStatusParams): Promise<PopulatedFlow> {
    const flowToUpdate = await this.getOneOrThrow({
      id,
      projectId,
      entityManager,
    });

    if (flowToUpdate.status !== newStatus) {
      const { scheduleOptions } = await flowSideEffects.preUpdateStatus({
        flowToUpdate,
        newStatus,
        entityManager,
      });

      flowToUpdate.status = newStatus;
      flowToUpdate.schedule = scheduleOptions;

      await flowRepo(entityManager).save(flowToUpdate);
    }

    return this.getOnePopulatedOrThrow({
      id,
      projectId,
      entityManager,
    });
  },

  async updateFailureCount({
    flowId,
    projectId,
    success,
  }: UpdateFailureCountParams): Promise<void> {
    const flow = await flowService.getOnePopulatedOrThrow({
      id: flowId,
      projectId,
    });

    const { schedule } = flow;
    const skipUpdateFlowCount =
      isNil(schedule) || flow.status === FlowStatus.DISABLED;

    if (skipUpdateFlowCount) {
      return;
    }
    const newFailureCount = success ? 0 : (schedule.failureCount ?? 0) + 1;

    if (newFailureCount >= TRIGGER_FAILURES_THRESHOLD) {
      await this.updateStatus({
        id: flowId,
        projectId,
        newStatus: FlowStatus.DISABLED,
      });
    }

    await flowRepo().update(flowId, {
      schedule: {
        ...flow.schedule,
        failureCount: newFailureCount,
      },
    });
  },

  async updatedPublishedVersionId({
    id,
    userId,
    projectId,
  }: UpdatePublishedVersionIdParams): Promise<PopulatedFlow> {
    const flowToUpdate = await this.getOneOrThrow({ id, projectId });

    const flowVersionToPublish = await flowVersionService.getFlowVersionOrThrow(
      {
        flowId: id,
        versionId: undefined,
      },
    );

    const { scheduleOptions } =
      await flowSideEffects.preUpdatePublishedVersionId({
        flowToUpdate,
        flowVersionToPublish,
      });

    return transaction(async (entityManager) => {
      const lockedFlowVersion = await lockFlowVersionIfNotLocked({
        flowVersion: flowVersionToPublish,
        userId,
        projectId,
        entityManager,
      });

      flowToUpdate.publishedVersionId = lockedFlowVersion.id;
      flowToUpdate.status = FlowStatus.ENABLED;
      flowToUpdate.schedule = scheduleOptions;

      const updatedFlow = await flowRepo(entityManager).save(flowToUpdate);

      return {
        ...updatedFlow,
        version: lockedFlowVersion,
      };
    });
  },

  async delete({ id, projectId, userId }: DeleteParams): Promise<void> {
    const lock = await distributedLock.acquireLock({
      key: id,
      timeout: 10000,
    });

    try {
      const flowToDelete = await this.getOneOrThrow({
        id,
        projectId,
      });

      await flowSideEffects.preDelete({
        flowToDelete,
      });

      await flowRepo().delete({ id });

      sendWorkflowDeletedEvent(userId, flowToDelete.id, projectId);
    } finally {
      await lock.release();
    }
  },

  async getAllEnabled(): Promise<Flow[]> {
    return flowRepo().findBy({
      status: FlowStatus.ENABLED,
    });
  },

  async getTemplate({
    userId,
    flowId,
    versionId,
    projectId,
  }: GetTemplateParams): Promise<FlowTemplateWithoutProjectInformation> {
    const flow = await this.getOnePopulatedOrThrow({
      id: flowId,
      projectId,
      versionId,
      removeConnectionsName: true,
      removeSampleData: true,
    });

    sendWorkflowExportedEvent({
      userId,
      flowId: flow.id,
      projectId: flow.projectId,
      flowVersionId: flow.version.id,
    });

    return {
      name: flow.version.displayName,
      blocks: flowHelper.getUsedBlocks(flow.version.trigger),
      template: flow.version,
      tags: [],
      services: [],
      domains: [],
      created: Date.now().toString(),
      updated: Date.now().toString(),
    };
  },

  async count({ projectId, folderId }: CountParams): Promise<number> {
    if (folderId === undefined) {
      return flowRepo().countBy({ projectId });
    }

    return flowRepo().countBy({
      folderId: folderId !== UNCATEGORIZED_FOLDER_ID ? folderId : IsNull(),
      projectId,
    });
  },
  async countEnabled({ projectId }: { projectId: ProjectId }): Promise<number> {
    return flowRepo().countBy({ projectId, status: FlowStatus.ENABLED });
  },
  async existsByProjectAndStatus(
    params: ExistsByProjectAndStatusParams,
  ): Promise<boolean> {
    const { projectId, status, entityManager } = params;

    return flowRepo(entityManager).existsBy({
      projectId,
      status,
    });
  },
};

async function create({
  projectId,
  request,
}: CreateParams): Promise<PopulatedFlow> {
  const folderId =
    isNil(request.folderId) || request.folderId === UNCATEGORIZED_FOLDER_ID
      ? null
      : request.folderId;

  const newFlow: NewFlow = {
    id: openOpsId(),
    projectId,
    folderId,
    status: FlowStatus.DISABLED,
    publishedVersionId: null,
    schedule: null,
  };

  const savedFlow = await flowRepo().save(newFlow);

  const savedFlowVersion = await flowVersionService.createEmptyVersion(
    savedFlow.id,
    {
      displayName: request.displayName,
      description: '',
    },
  );

  return {
    ...savedFlow,
    version: savedFlowVersion,
  };
}

async function update({
  id,
  userId,
  projectId,
  operation,
  lock = true,
}: UpdateParams): Promise<PopulatedFlow> {
  const flowLock = lock
    ? await distributedLock.acquireLock({
        key: id,
        timeout: 30000,
      })
    : null;

  try {
    if (operation.type === FlowOperationType.LOCK_AND_PUBLISH) {
      await flowService.updatedPublishedVersionId({
        id,
        userId,
        projectId,
      });
    } else if (operation.type === FlowOperationType.CHANGE_STATUS) {
      await flowService.updateStatus({
        id,
        projectId,
        newStatus: operation.request.status,
      });
    } else if (operation.type === FlowOperationType.CHANGE_FOLDER) {
      await flowRepo().update(id, {
        folderId: operation.request.folderId,
      });
    } else {
      let lastVersion = await flowVersionService.getFlowVersionOrThrow({
        flowId: id,
        versionId: undefined,
      });

      if (lastVersion.state === FlowVersionState.LOCKED) {
        const lastVersionWithArtifacts =
          await flowVersionService.getFlowVersionOrThrow({
            flowId: id,
            versionId: undefined,
          });

        lastVersion = await flowVersionService.createEmptyVersion(id, {
          displayName: lastVersionWithArtifacts.displayName,
          description: lastVersionWithArtifacts.description ?? '',
        });

        // Duplicate the artifacts from the previous version, otherwise they will be deleted during update operation
        lastVersion = await flowVersionService.applyOperation({
          userId,
          projectId,
          flowVersion: lastVersion,
          userOperation: {
            type: FlowOperationType.IMPORT_FLOW,
            request: lastVersionWithArtifacts,
          },
        });
      }

      await flowVersionService.applyOperation({
        userId,
        projectId,
        flowVersion: lastVersion,
        userOperation: operation,
      });
    }
  } finally {
    await flowLock?.release();
  }

  const result = await flowService.getOnePopulatedOrThrow({
    id,
    projectId,
  });

  return result;
}

const lockFlowVersionIfNotLocked = async ({
  flowVersion,
  userId,
  projectId,
  entityManager,
}: LockFlowVersionIfNotLockedParams): Promise<FlowVersion> => {
  if (flowVersion.state === FlowVersionState.LOCKED) {
    return flowVersion;
  }

  return flowVersionService.applyOperation({
    userId,
    projectId,
    flowVersion,
    userOperation: {
      type: FlowOperationType.LOCK_FLOW,
      request: {
        flowId: flowVersion.flowId,
      },
    },
    entityManager,
  });
};

const assertFlowIsNotNull: <T extends Flow>(
  flow: T | null,
) => asserts flow is T = <T>(flow: T | null) => {
  if (isNil(flow)) {
    throw new ApplicationError({
      code: ErrorCode.ENTITY_NOT_FOUND,
      params: {},
    });
  }
};

type CreateParams = {
  userId: UserId;
  projectId: ProjectId;
  request: CreateEmptyFlowRequest;
};

type CreateFromTemplateParams = {
  templateId: string;
  projectId: ProjectId;
  userId: UserId;
  displayName: string;
  description: string | undefined;
  trigger: Trigger;
  connectionIds: string[];
  isSample: boolean;
};

type ListParams = {
  projectId: ProjectId;
  cursorRequest: Cursor | null;
  limit: number;
  folderId: string | undefined;
  status: FlowStatus[] | undefined;
  name: string | undefined;
  versionState: FlowVersionState[] | null;
};

type GetOneParams = {
  id: FlowId;
  projectId: ProjectId;
  entityManager?: EntityManager;
};

type GetOnePopulatedParams = GetOneParams & {
  versionId?: FlowVersionId;
  removeConnectionsName?: boolean;
  removeSampleData?: boolean;
};

type GetTemplateParams = {
  userId: UserId;
  flowId: FlowId;
  projectId: ProjectId;
  versionId: FlowVersionId | undefined;
};

type CountParams = {
  projectId: ProjectId;
  folderId?: string;
};

type UpdateParams = {
  id: FlowId;
  userId: UserId;
  projectId: ProjectId;
  operation: FlowOperationRequest;
  lock?: boolean;
};

type UpdateStatusParams = {
  id: FlowId;
  projectId: ProjectId;
  newStatus: FlowStatus;
  entityManager?: EntityManager;
};

type UpdateFailureCountParams = {
  flowId: FlowId;
  projectId: ProjectId;
  success: boolean;
};

type UpdatePublishedVersionIdParams = {
  id: FlowId;
  userId: UserId | null;
  projectId: ProjectId;
};

type DeleteParams = {
  id: FlowId;
  userId: UserId;
  projectId: ProjectId;
};

type NewFlow = Omit<Flow, 'created' | 'updated'>;

type LockFlowVersionIfNotLockedParams = {
  flowVersion: FlowVersion;
  userId: UserId | null;
  projectId: ProjectId;
  entityManager: EntityManager;
};

type ExistsByProjectAndStatusParams = {
  projectId: ProjectId;
  status: FlowStatus;
  entityManager: EntityManager;
};
