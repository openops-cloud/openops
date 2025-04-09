import {
  distributedLock,
  exceptionHandler,
  flowTimeoutSandbox,
  logger,
  OneTimeJobData,
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
      result.status === FlowRunStatus.INTERNAL_ERROR
    ) {
      const isTimeoutError = status === EngineResponseStatus.TIMEOUT;
      if (isTimeoutError) {
        await handleTimeoutError(jobData, engineToken);
      } else {
        await handleInternalError(
          jobData,
          engineToken,
          new ApplicationError({
            code: ErrorCode.ENGINE_OPERATION_FAILURE,
            params: {
              message: result.error?.message ?? 'internal error',
            },
          }),
        );
      }
    }
  } catch (e) {
    const isTimeoutError =
      e instanceof ApplicationError &&
      e.error.code === ErrorCode.EXECUTION_TIMEOUT;
    if (isTimeoutError) {
      await handleTimeoutError(jobData, engineToken);
    } else {
      await handleInternalError(jobData, engineToken, e as Error);
    }
  } finally {
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
): Promise<void> {
  await engineApiService(engineToken).updateRunStatus({
    runDetails: {
      steps: {},
      duration: 0,
      status: FlowRunStatus.TIMEOUT,
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

export const flowJobExecutor = {
  executeFlow,
};
