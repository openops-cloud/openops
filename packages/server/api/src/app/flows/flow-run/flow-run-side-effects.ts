import {
  JobType,
  LATEST_JOB_DATA_SCHEMA_VERSION,
  logger,
  RepeatableJobType,
} from '@openops/server-shared';
import {
  ApplicationError,
  ErrorCode,
  ExecutionType,
  FlowRun,
  isNil,
  ProgressUpdateType,
} from '@openops/shared';
import dayjs from 'dayjs';
import { flowQueue } from '../../workers/queue';
import { JOB_PRIORITY } from '../../workers/queue/queue-manager';
import { flowRunHooks } from './flow-run-hooks';

type StartParams = {
  flowRun: FlowRun;
  executionType: ExecutionType;
  payload: unknown;
  priority: keyof typeof JOB_PRIORITY;
  synchronousHandlerId: string | undefined;
  progressUpdateType: ProgressUpdateType;
  executionCorrelationId: string;
};

type PauseParams = {
  flowRun: FlowRun;
  executionCorrelationId: string;
};

const calculateDelayForPausedRun = (
  resumeDateTimeIsoString: string,
): number => {
  const now = dayjs();
  const resumeDateTime = dayjs(resumeDateTimeIsoString);
  const delayInMilliSeconds = resumeDateTime.diff(now);
  const resumeDateTimeAlreadyPassed = delayInMilliSeconds < 0;

  if (resumeDateTimeAlreadyPassed) {
    return 0;
  }

  return delayInMilliSeconds;
};

export const flowRunSideEffects = {
  async finish({ flowRun }: { flowRun: FlowRun }): Promise<void> {
    await flowRunHooks
      .getHooks()
      .onFinish({ projectId: flowRun.projectId, tasks: flowRun.tasks! });
  },
  async start({
    flowRun,
    executionType,
    payload,
    synchronousHandlerId,
    executionCorrelationId,
    priority,
    progressUpdateType,
  }: StartParams): Promise<boolean> {
    logger.info(
      `[FlowRunSideEffects#start] flowRunId=${flowRun.id} executionType=${executionType}`,
    );

    const jobAdded = await flowQueue.add({
      executionCorrelationId,
      type: JobType.ONE_TIME,
      priority,
      data: {
        executionCorrelationId,
        synchronousHandlerId: synchronousHandlerId ?? null,
        projectId: flowRun.projectId,
        environment: flowRun.environment,
        runId: flowRun.id,
        flowVersionId: flowRun.flowVersionId,
        payload,
        executionType,
        progressUpdateType,
      },
    });

    return jobAdded;
  },

  async pause({ flowRun, executionCorrelationId }: PauseParams): Promise<void> {
    logger.info(
      `[FlowRunSideEffects#pause] flowRunId=${
        flowRun.id
      } pauseMetadata=${JSON.stringify(flowRun.pauseMetadata)}`,
    );

    const { pauseMetadata } = flowRun;

    if (isNil(pauseMetadata)) {
      throw new ApplicationError({
        code: ErrorCode.VALIDATION,
        params: {
          message: `pauseMetadata is undefined flowRunId=${flowRun.id}`,
        },
      });
    }

    if (pauseMetadata.resumeDateTime) {
      await flowQueue.add({
        executionCorrelationId,
        type: JobType.DELAYED,
        data: {
          executionCorrelationId,
          schemaVersion: LATEST_JOB_DATA_SCHEMA_VERSION,
          runId: flowRun.id,
          synchronousHandlerId: flowRun.pauseMetadata?.handlerId ?? null,
          progressUpdateType:
            flowRun.pauseMetadata?.progressUpdateType ??
            ProgressUpdateType.NONE,
          projectId: flowRun.projectId,
          environment: flowRun.environment,
          jobType: RepeatableJobType.DELAYED_FLOW,
          flowVersionId: flowRun.flowVersionId,
        },
        delay: calculateDelayForPausedRun(pauseMetadata.resumeDateTime),
      });
    }
  },
};
