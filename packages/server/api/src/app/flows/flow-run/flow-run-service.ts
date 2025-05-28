import { exceptionHandler, logger } from '@openops/server-shared';
import {
  ApplicationError,
  Cursor,
  ErrorCode,
  ExecutionState,
  ExecutionType,
  ExecutioOutputFile,
  FileCompression,
  FileType,
  FlagId,
  FlowId,
  FlowRetryStrategy,
  FlowRun,
  FlowRunId,
  FlowRunStatus,
  FlowVersionId,
  isEmpty,
  isNil,
  MAX_LOG_SIZE,
  openOpsId,
  PauseMetadata,
  ProgressUpdateType,
  ProjectId,
  RunEnvironment,
  SeekPage,
  spreadIfDefined,
} from '@openops/shared';
import { nanoid } from 'nanoid';
import { In, LessThan } from 'typeorm';
import { repoFactory } from '../../core/db/repo-factory';
import { APArrayContains } from '../../database/database-connection';
import { fileService } from '../../file/file.service';
import { devFlagsService } from '../../flags/dev-flags.service';
import { buildPaginator } from '../../helper/pagination/build-paginator';
import { paginationHelper } from '../../helper/pagination/pagination-utils';
import { Order } from '../../helper/pagination/paginator';
import { webhookResponseWatcher } from '../../workers/helper/webhook-response-watcher';
import { getJobPriority } from '../../workers/queue/queue-manager';
import { flowVersionService } from '../flow-version/flow-version.service';
import { flowService } from '../flow/flow.service';
import { flowStepTestOutputService } from '../step-test-output/flow-step-test-output.service';
import { FlowRunEntity } from './flow-run-entity';
import { flowRunSideEffects } from './flow-run-side-effects';
import { logSerializer } from './log-serializer';

export const flowRunRepo = repoFactory<FlowRun>(FlowRunEntity);

const getFlowRunOrCreate = async (
  params: GetOrCreateParams,
): Promise<Partial<FlowRun>> => {
  const { id, projectId, flowId, flowVersionId, flowDisplayName, environment } =
    params;

  if (id) {
    return flowRunService.getOneOrThrow({
      id,
      projectId,
    });
  }

  return {
    id: openOpsId(),
    projectId,
    flowId,
    flowVersionId,
    environment,
    flowDisplayName,
    startTime: new Date().toISOString(),
  };
};

async function updateFlowRunToLatestFlowVersionIdAndReturnPayload(
  flowRunId: FlowRunId,
): Promise<unknown> {
  const flowRun = await flowRunService.getOnePopulatedOrThrow({
    id: flowRunId,
    projectId: undefined,
  });
  const flowVersion = await flowVersionService.getLatestLockedVersionOrThrow(
    flowRun.flowId,
  );
  await flowRunRepo().update(flowRunId, {
    flowVersionId: flowVersion.id,
  });
  return flowRun.steps
    ? flowRun.steps[flowVersion.trigger.name]?.output
    : undefined;
}

function returnHandlerId(
  pauseMetadata: PauseMetadata | undefined,
  executionCorrelationId: string,
): string {
  const handlerId = webhookResponseWatcher.getServerId();
  if (isNil(pauseMetadata)) {
    return handlerId;
  }

  if (
    executionCorrelationId === pauseMetadata.executionCorrelationId &&
    pauseMetadata.handlerId
  ) {
    return pauseMetadata.handlerId;
  } else {
    return handlerId;
  }
}

export const flowRunService = {
  async list({
    projectId,
    flowId,
    status,
    cursor,
    limit,
    tags,
    createdAfter,
    createdBefore,
  }: ListParams): Promise<SeekPage<FlowRun>> {
    const decodedCursor = paginationHelper.decodeCursor(cursor);
    const paginator = buildPaginator<FlowRun>({
      entity: FlowRunEntity,
      query: {
        limit,
        order: Order.DESC,
        afterCursor: decodedCursor.nextCursor,
        beforeCursor: decodedCursor.previousCursor,
      },
    });

    let query = flowRunRepo().createQueryBuilder('flow_run').where({
      projectId,
      environment: RunEnvironment.PRODUCTION,
    });
    if (flowId) {
      query = query.andWhere({
        flowId: In(flowId),
      });
    }
    if (status) {
      query = query.andWhere({
        status: In(status),
      });
    }
    if (createdAfter) {
      query = query.andWhere('flow_run.created >= :createdAfter', {
        createdAfter,
      });
    }
    if (createdBefore) {
      query = query.andWhere('flow_run.created <= :createdBefore', {
        createdBefore,
      });
    }
    if (tags) {
      query = APArrayContains('tags', tags, query);
    }
    const { data, cursor: newCursor } = await paginator.paginate(query);
    return paginationHelper.createPage<FlowRun>(data, newCursor);
  },
  async count({
    projectId,
    status,
    createdAfter,
    createdBefore,
  }: {
    projectId: ProjectId;
    status?: FlowRunStatus[];
    createdAfter?: string;
    createdBefore?: string;
  }): Promise<number> {
    let query = flowRunRepo().createQueryBuilder('flow_run').where({
      projectId,
      environment: RunEnvironment.PRODUCTION,
    });

    if (createdAfter) {
      query = query.andWhere('flow_run.created >= :createdAfter', {
        createdAfter,
      });
    }
    if (createdBefore) {
      query = query.andWhere('flow_run.created <= :createdBefore', {
        createdBefore,
      });
    }
    if (status && !isEmpty(status)) {
      query = query.andWhere({
        status: In(status),
      });
    }

    return query.getCount();
  },
  async retry({ flowRunId, strategy }: RetryParams): Promise<FlowRun | null> {
    switch (strategy) {
      case FlowRetryStrategy.FROM_FAILED_STEP:
        return flowRunService.addToQueue({
          executionCorrelationId: nanoid(),
          flowRunId,
          executionType: ExecutionType.RESUME,
          progressUpdateType: ProgressUpdateType.NONE,
        });
      case FlowRetryStrategy.ON_LATEST_VERSION: {
        const payload =
          await updateFlowRunToLatestFlowVersionIdAndReturnPayload(flowRunId);
        return flowRunService.addToQueue({
          executionCorrelationId: nanoid(),
          payload,
          flowRunId,
          executionType: ExecutionType.BEGIN,
          progressUpdateType: ProgressUpdateType.NONE,
        });
      }
    }
  },
  async addToQueue({
    flowRunId,
    payload,
    executionCorrelationId,
    progressUpdateType,
    executionType,
  }: {
    flowRunId: FlowRunId;
    executionCorrelationId: string;
    progressUpdateType: ProgressUpdateType;
    payload?: unknown;
    executionType: ExecutionType;
  }): Promise<FlowRun | null> {
    logger.info(`[FlowRunService#resume] flowRunId=${flowRunId}`);

    const flowRunToResume = await flowRunRepo().findOneBy({
      id: flowRunId,
    });

    if (isNil(flowRunToResume)) {
      throw new ApplicationError({
        code: ErrorCode.FLOW_RUN_NOT_FOUND,
        params: {
          id: flowRunId,
        },
      });
    }
    const pauseMetadata = flowRunToResume.pauseMetadata;
    return flowRunService.start({
      payload,
      flowRunId: flowRunToResume.id,
      projectId: flowRunToResume.projectId,
      flowVersionId: flowRunToResume.flowVersionId,
      synchronousHandlerId: returnHandlerId(
        pauseMetadata,
        executionCorrelationId,
      ),
      executionCorrelationId,
      progressUpdateType,
      executionType,
      environment: RunEnvironment.PRODUCTION,
    });
  },
  async updateStatus({
    flowRunId,
    status,
    tasks,
    executionState,
    projectId,
    tags,
    duration,
  }: FinishParams): Promise<FlowRun> {
    const logFileId = await updateLogs({
      flowRunId,
      projectId,
      executionState,
    });

    await flowRunRepo().update(flowRunId, {
      status,
      tasks,
      ...spreadIfDefined(
        'duration',
        duration ? Math.floor(Number(duration)) : undefined,
      ),
      ...spreadIfDefined('logsFileId', logFileId),
      terminationReason: undefined,
      tags,
      finishTime: new Date().toISOString(),
    });
    const flowRun = await this.getOnePopulatedOrThrow({
      id: flowRunId,
      projectId: undefined,
    });

    await flowRunSideEffects.finish({ flowRun });
    return flowRun;
  },

  async start({
    projectId,
    flowVersionId,
    flowRunId,
    payload,
    environment,
    executionType,
    synchronousHandlerId,
    progressUpdateType,
    executionCorrelationId,
  }: StartParams): Promise<FlowRun> {
    const flowVersion = await flowVersionService.getOneOrThrow(flowVersionId);

    const flow = await flowService.getOneOrThrow({
      id: flowVersion.flowId,
      projectId,
    });

    const flowRun = await getFlowRunOrCreate({
      id: flowRunId,
      projectId: flow.projectId,
      flowId: flowVersion.flowId,
      flowVersionId: flowVersion.id,
      environment,
      flowDisplayName: flowVersion.displayName,
    });

    flowRun.status = FlowRunStatus.SCHEDULED;

    let savedFlowRun = await flowRunRepo().save(flowRun);

    const priority = await getJobPriority(
      savedFlowRun.projectId,
      synchronousHandlerId,
    );

    const jobAdded = await flowRunSideEffects.start({
      flowRun: savedFlowRun,
      executionCorrelationId,
      payload,
      priority,
      synchronousHandlerId,
      executionType,
      progressUpdateType,
    });

    if (!jobAdded) {
      savedFlowRun.status = FlowRunStatus.IGNORED;

      savedFlowRun = await flowRunRepo().save(flowRun);
    }

    return savedFlowRun;
  },

  async test({ projectId, flowVersionId }: TestParams): Promise<FlowRun> {
    const flowVersion = await flowVersionService.getOneOrThrow(flowVersionId);

    let payload = flowVersion.trigger.settings.inputUiInfo.currentSelectedData;
    const featureFlag = await devFlagsService.getOne(
      FlagId.USE_NEW_EXTERNAL_TESTDATA,
    );
    if (featureFlag?.value) {
      payload = await flowStepTestOutputService.listDecrypted({
        flowVersionId: flowVersion.id,
        stepIds: [flowVersion.trigger.id!],
      });
    }

    return this.start({
      projectId,
      flowVersionId,
      payload,
      environment: RunEnvironment.TESTING,
      executionType: ExecutionType.BEGIN,
      synchronousHandlerId: webhookResponseWatcher.getServerId(),
      executionCorrelationId: nanoid(),
      progressUpdateType: ProgressUpdateType.TEST_FLOW,
    });
  },

  async pause(params: PauseParams): Promise<void> {
    logger.info(
      `[FlowRunService#pause] flowRunId=${
        params.flowRunId
      } pauseMetadata=${JSON.stringify(params.pauseMetadata)}`,
    );

    const { flowRunId, pauseMetadata } = params;

    await flowRunRepo().update(flowRunId, {
      status: FlowRunStatus.PAUSED,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pauseMetadata: pauseMetadata as any,
    });

    const flowRun = await flowRunRepo().findOneByOrFail({ id: flowRunId });

    await flowRunSideEffects.pause({
      flowRun,
      executionCorrelationId: pauseMetadata.executionCorrelationId ?? nanoid(),
    });
  },

  async getOneOrThrow(params: GetOneParams): Promise<FlowRun> {
    const flowRun = await flowRunRepo().findOneBy({
      projectId: params.projectId,
      id: params.id,
    });

    if (isNil(flowRun)) {
      throw new ApplicationError({
        code: ErrorCode.FLOW_RUN_NOT_FOUND,
        params: {
          id: params.id,
        },
      });
    }

    return flowRun;
  },
  async getOnePopulatedOrThrow(params: GetOneParams): Promise<FlowRun> {
    const flowRun = await this.getOneOrThrow(params);
    let steps = {};
    if (!isNil(flowRun.logsFileId)) {
      const logFile = await fileService.getOneOrThrow({
        fileId: flowRun.logsFileId,
        projectId: flowRun.projectId,
      });

      const serializedExecutionOutput = logFile.data.toString('utf-8');
      const executionOutput: ExecutioOutputFile = JSON.parse(
        serializedExecutionOutput,
      );
      steps = executionOutput.executionState.steps;
    }
    return {
      ...flowRun,
      steps,
    };
  },

  async getRunningWorkflowsOlderThan(
    dateISOString: string,
  ): Promise<FlowRun[]> {
    return flowRunRepo().findBy({
      status: FlowRunStatus.RUNNING,
      updated: LessThan(dateISOString),
    });
  },
};

async function updateLogs({
  flowRunId,
  projectId,
  executionState,
}: UpdateLogs): Promise<undefined | string> {
  if (isNil(executionState)) {
    return undefined;
  }
  const flowRun = await flowRunRepo().findOneByOrFail({ id: flowRunId });
  const serializedLogs = await logSerializer.serialize({
    executionState,
  });

  if (serializedLogs.byteLength > MAX_LOG_SIZE) {
    const errors = new Error(
      'Execution Output is too large, maximum size is ' + MAX_LOG_SIZE,
    );
    exceptionHandler.handle(errors);
    throw errors;
  }
  const fileId = flowRun.logsFileId ?? openOpsId();
  await fileService.save({
    fileId,
    projectId,
    data: serializedLogs,
    type: FileType.FLOW_RUN_LOG,
    compression: FileCompression.GZIP,
  });
  return fileId;
}

type UpdateLogs = {
  flowRunId: string;
  projectId: ProjectId;
  executionState: ExecutionState | null;
};

type FinishParams = {
  flowRunId: FlowRunId;
  projectId: string;
  status: FlowRunStatus;
  tasks: number;
  duration: number | undefined;
  executionState: ExecutionState | null;
  tags: string[];
};

type GetOrCreateParams = {
  id?: FlowRunId;
  projectId: ProjectId;
  flowId: FlowId;
  flowVersionId: FlowVersionId;
  flowDisplayName: string;
  environment: RunEnvironment;
};

type ListParams = {
  projectId: ProjectId;
  flowId: FlowId[] | undefined;
  status: FlowRunStatus[] | undefined;
  cursor: Cursor | null;
  tags?: string[];
  limit: number;
  createdAfter?: string;
  createdBefore?: string;
};

type GetOneParams = {
  id: FlowRunId;
  projectId: ProjectId | undefined;
};

type StartParams = {
  projectId: ProjectId;
  flowVersionId: FlowVersionId;
  flowRunId?: FlowRunId;
  environment: RunEnvironment;
  payload: unknown;
  synchronousHandlerId: string | undefined;
  executionCorrelationId: string;
  progressUpdateType: ProgressUpdateType;
  executionType: ExecutionType;
};

type TestParams = {
  projectId: ProjectId;
  flowVersionId: FlowVersionId;
};

type PauseParams = {
  flowRunId: FlowRunId;
  pauseMetadata: PauseMetadata;
};

type RetryParams = {
  flowRunId: FlowRunId;
  strategy: FlowRetryStrategy;
};
