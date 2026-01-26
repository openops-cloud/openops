import {
  distributedLock,
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
  extractPropertyString,
  FlowRunStatus,
  FlowVersion,
  GetFlowVersionForWorkerRequestType,
  isNil,
  ResumeExecuteFlowOperation,
  ResumePayload,
  StepOutputStatus,
} from '@openops/shared';
import { engineApiService } from '../api/server-api.service';
import { engineRunner } from '../engine';

type EngineConstants = 'internalApiUrl' | 'publicUrl' | 'engineToken';
const ENGINE_EXECUTION_ERROR_MESSAGE = 'Engine execution failed.';

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

      if (
        flowRun.status === FlowRunStatus.SUCCEEDED ||
        flowRun.status === FlowRunStatus.STOPPED
      ) {
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
        previousDuration: flowRun.duration,
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

  const flow = await engineApiService(engineToken).getFlowWithExactBlocks({
    versionId: jobData.flowVersionId,
    type: GetFlowVersionForWorkerRequestType.EXACT,
  });

  if (isNil(flow)) {
    return;
  }

  let jobStatus: JobStatus | undefined;
  let jobFinalMessage: string | undefined;
  try {
    if (jobData.executionType === ExecutionType.BEGIN) {
      await setFirstRunningState(
        jobData,
        engineToken,
        flow.version.trigger.name,
        flow.version.trigger.type,
        flow.id,
      );
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

    const { engineSucceeded, failedRunStatus } = evaluateEngineStatus(
      status,
      result.status,
    );

    if (engineSucceeded) {
      return;
    }

    const terminationReason =
      extractPropertyString(result, ['message']) ||
      ENGINE_EXECUTION_ERROR_MESSAGE;

    logger.info(ENGINE_EXECUTION_ERROR_MESSAGE, {
      engineResponseStatus: status,
      flowRunStatus: result.status,
      terminationReason,
    });

    await updateRunWithError(
      jobData,
      engineToken,
      flow.id,
      failedRunStatus,
      terminationReason,
    );

    if (failedRunStatus === FlowRunStatus.INTERNAL_ERROR) {
      const errorMessage = result.error?.message ?? terminationReason;
      jobStatus = JobStatus.FAILED;
      jobFinalMessage = `Internal error reported by engine. Error message: ${errorMessage}`;
    }
  } catch (e) {
    const isTimeoutError =
      e instanceof ApplicationError &&
      e.error.code === ErrorCode.EXECUTION_TIMEOUT;

    const failedRunStatus = isTimeoutError
      ? FlowRunStatus.TIMEOUT
      : FlowRunStatus.INTERNAL_ERROR;

    const terminationReason = isTimeoutError
      ? 'Engine execution timed out.'
      : 'Flow execution encountered an internal error';

    logger.info(ENGINE_EXECUTION_ERROR_MESSAGE, {
      flowRunStatus: failedRunStatus,
      terminationReason,
      error: e,
    });

    await updateRunWithError(
      jobData,
      engineToken,
      flow.id,
      failedRunStatus,
      terminationReason,
    );

    if (failedRunStatus === FlowRunStatus.INTERNAL_ERROR) {
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
  triggerName: string,
  triggerType: string,
  flowId: string,
): Promise<void> {
  await engineApiService(engineToken).updateRunStatus({
    runDetails: {
      steps: {
        [triggerName]: {
          status: StepOutputStatus.SUCCEEDED,
          output: jobData.payload,
          type: triggerType,
          input: {},
        },
      },
      duration: 0,
      status: FlowRunStatus.RUNNING,
      tasks: 0,
    },
    executionCorrelationId: jobData.executionCorrelationId,
    progressUpdateType: jobData.progressUpdateType,
    workerHandlerId: jobData.synchronousHandlerId,
    runId: jobData.runId,
    flowId,
  });
}

async function updateRunWithError(
  jobData: OneTimeJobData,
  engineToken: string,
  flowId: string,
  status:
    | FlowRunStatus.TIMEOUT
    | FlowRunStatus.STOPPED
    | FlowRunStatus.INTERNAL_ERROR,
  terminationReason: string | null,
): Promise<void> {
  await engineApiService(engineToken).updateRunStatus({
    runDetails: {
      steps: {},
      duration: 0,
      status,
      tasks: 0,
      tags: [],
      terminationReason: terminationReason || undefined,
    },
    executionCorrelationId: jobData.executionCorrelationId,
    progressUpdateType: jobData.progressUpdateType,
    workerHandlerId: jobData.synchronousHandlerId,
    runId: jobData.runId,
    flowId,
  });
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

type EvaluateEngineStatusResult =
  | { engineSucceeded: true; failedRunStatus: undefined }
  | {
      engineSucceeded: false;
      failedRunStatus:
        | FlowRunStatus.TIMEOUT
        | FlowRunStatus.STOPPED
        | FlowRunStatus.INTERNAL_ERROR;
    };

function evaluateEngineStatus(
  engineResponseStatus: EngineResponseStatus,
  flowRunStatus: FlowRunStatus,
): EvaluateEngineStatusResult {
  const failureStatuses = [
    FlowRunStatus.TIMEOUT,
    FlowRunStatus.STOPPED,
    FlowRunStatus.INTERNAL_ERROR,
  ];

  if (
    engineResponseStatus === EngineResponseStatus.OK &&
    !failureStatuses.includes(flowRunStatus)
  ) {
    return { engineSucceeded: true, failedRunStatus: undefined };
  }

  if (
    engineResponseStatus === EngineResponseStatus.TIMEOUT ||
    flowRunStatus === FlowRunStatus.TIMEOUT
  ) {
    return { engineSucceeded: false, failedRunStatus: FlowRunStatus.TIMEOUT };
  }

  if (flowRunStatus === FlowRunStatus.STOPPED) {
    return { engineSucceeded: false, failedRunStatus: FlowRunStatus.STOPPED };
  }

  return {
    engineSucceeded: false,
    failedRunStatus: FlowRunStatus.INTERNAL_ERROR,
  };
}

export const flowJobExecutor = {
  executeFlow,
};
