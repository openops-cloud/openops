import {
  distributedLock,
  exceptionHandler,
  flowTimeoutSandbox,
  JobStatus,
  logger,
  OneTimeJobData,
  QueueName,
} from '@openops/server-shared';
import {
  ApplicationError,
  BeginExecuteFlowOperation,
  EngineResponseStatus,
  ErrorCode,
  ExecutionType,
  FlowRunStatus,
  FlowVersion,
  GetFlowVersionForWorkerRequestType,
  isNil,
  ResumeExecuteFlowOperation,
  ResumePayload,
} from '@openops/shared';
import { engineApiService } from '../api/server-api.service';
import { engineRunner } from '../engine';

type EngineConstants = 'internalApiUrl' | 'publicUrl' | 'engineToken';

async function prepareInput(
  flowVersion: FlowVersion,
  jobData: OneTimeJobData,
  engineToken: string,
): Promise<
  | Omit<BeginExecuteFlowOperation, EngineConstants>
  | Omit<ResumeExecuteFlowOperation, EngineConstants>
  | undefined
> {
  switch (jobData.executionType) {
    case ExecutionType.BEGIN:
      return {
        flowVersion,
        flowRunId: jobData.runId,
        projectId: jobData.projectId,
        serverHandlerId: jobData.synchronousHandlerId ?? null,
        triggerPayload: jobData.payload,
        executionType: ExecutionType.BEGIN,
        runEnvironment: jobData.environment,
        executionCorrelationId: jobData.executionCorrelationId,
        progressUpdateType: jobData.progressUpdateType,
      };
    case ExecutionType.RESUME: {
      const flowRun = await engineApiService(engineToken).getRun({
        runId: jobData.runId,
      });

      if (flowRun.status === FlowRunStatus.SUCCEEDED) {
        return undefined;
      }

      return {
        flowVersion,
        flowRunId: jobData.runId,
        projectId: jobData.projectId,
        serverHandlerId: jobData.synchronousHandlerId ?? null,
        tasks: flowRun.tasks ?? 0,
        executionType: ExecutionType.RESUME,
        steps: flowRun.steps,
        runEnvironment: jobData.environment,
        executionCorrelationId: jobData.executionCorrelationId,
        resumePayload: jobData.payload as ResumePayload,
        progressUpdateType: jobData.progressUpdateType,
      };
    }
  }
}
async function executeFlow(
  jobData: OneTimeJobData,
  engineToken: string,
): Promise<void> {
  const flowRunLock = await distributedLock.acquireLock({
    key: jobData.runId,
    timeout: (flowTimeoutSandbox + 3) * 1000, // Engine timeout plus 3 more seconds
  });

  let jobStatus: JobStatus | undefined;
  let jobFinalMessage: string | undefined;
  try {
    if (jobData.executionType === ExecutionType.BEGIN) {
      await setFirstRunningState(jobData, engineToken);
    }

    const flow = await engineApiService(engineToken).getFlowWithExactBlocks({
      versionId: jobData.flowVersionId,
      type: GetFlowVersionForWorkerRequestType.EXACT,
    });

    if (isNil(flow)) {
      return;
    }

    const input = await prepareInput(flow.version, jobData, engineToken);
    if (input === undefined) {
      logger.info('Flow run is already completed', flow);
      return;
    }

    const { status, result } = await engineRunner.executeFlow(
      engineToken,
      input,
    );

    if (
      status !== EngineResponseStatus.OK ||
      result.status === FlowRunStatus.INTERNAL_ERROR ||
      result.status === FlowRunStatus.STOPPED
    ) {
      const isTimeoutError = status === EngineResponseStatus.TIMEOUT;
      const isAbortedError = result.status === FlowRunStatus.STOPPED;

      if (isTimeoutError) {
        await handleTimeoutError(jobData, engineToken, FlowRunStatus.TIMEOUT);
      } else if (isAbortedError) {
        await handleTimeoutError(jobData, engineToken, FlowRunStatus.STOPPED);
      } else {
        const errorMessage = result.error?.message ?? 'internal error';
        await handleInternalError(
          jobData,
          engineToken,
          new ApplicationError({
            code: ErrorCode.ENGINE_OPERATION_FAILURE,
            params: {
              message: errorMessage,
            },
          }),
        );

        jobStatus = JobStatus.FAILED;
        jobFinalMessage = `Internal error reported by engine. Error message: ${errorMessage}`;
      }
    }
  } catch (e) {
    const isTimeoutError =
      e instanceof ApplicationError &&
      e.error.code === ErrorCode.EXECUTION_TIMEOUT;
    if (isTimeoutError) {
      await handleTimeoutError(jobData, engineToken, FlowRunStatus.TIMEOUT);
    } else {
      await handleInternalError(jobData, engineToken, e as Error);
      jobStatus = JobStatus.FAILED;
      jobFinalMessage = `Internal error reported by engine. Error message: ${
        (e as Error).message
      }`;
    }
  } finally {
    await updateJobStatus(engineToken, jobStatus, jobFinalMessage);
    await flowRunLock.release();
  }
}

async function setFirstRunningState(
  jobData: OneTimeJobData,
  engineToken: string,
): Promise<void> {
  await engineApiService(engineToken).updateRunStatus({
    runDetails: {
      steps: {},
      duration: 0,
      status: FlowRunStatus.RUNNING,
      tasks: 0,
    },
    executionCorrelationId: jobData.executionCorrelationId,
    progressUpdateType: jobData.progressUpdateType,
    workerHandlerId: jobData.synchronousHandlerId,
    runId: jobData.runId,
  });
}

async function handleTimeoutError(
  jobData: OneTimeJobData,
  engineToken: string,
  status: FlowRunStatus.TIMEOUT | FlowRunStatus.STOPPED,
): Promise<void> {
  await engineApiService(engineToken).updateRunStatus({
    runDetails: {
      steps: {},
      duration: 0,
      status, //FlowRunStatus.TIMEOUT,
      tasks: 0,
      tags: [],
    },
    executionCorrelationId: jobData.executionCorrelationId,
    progressUpdateType: jobData.progressUpdateType,
    workerHandlerId: jobData.synchronousHandlerId,
    runId: jobData.runId,
  });
}

async function handleInternalError(
  jobData: OneTimeJobData,
  engineToken: string,
  e: Error,
): Promise<void> {
  await engineApiService(engineToken).updateRunStatus({
    runDetails: {
      steps: {},
      duration: 0,
      status: FlowRunStatus.INTERNAL_ERROR,
      tasks: 0,
      tags: [],
    },
    executionCorrelationId: jobData.executionCorrelationId,
    progressUpdateType: jobData.progressUpdateType,
    workerHandlerId: jobData.synchronousHandlerId,
    runId: jobData.runId,
  });
  exceptionHandler.handle(e);
}

async function updateJobStatus(
  engineToken: string,
  status: JobStatus = JobStatus.COMPLETED,
  message = 'Flow succeeded',
): Promise<void> {
  await engineApiService(engineToken).updateJobStatus({
    status,
    message,
    queueName: QueueName.ONE_TIME,
  });
}

export const flowJobExecutor = {
  executeFlow,
};
