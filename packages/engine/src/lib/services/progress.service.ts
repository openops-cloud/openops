/* eslint-disable @typescript-eslint/no-explicit-any */
import { makeHttpRequest } from '@openops/common';
import {
  BodyAccessKeyRequest,
  logger,
  memoryLock,
  saveRequestBody,
} from '@openops/server-shared';
import { FlowRunId, UpdateRunProgressRequest } from '@openops/shared';
import { AxiosError, AxiosHeaders } from 'axios';
import { isRetryableError } from 'axios-retry';
import debounce from 'lodash.debounce';
import { EngineConstants } from '../handler/context/engine-constants';
import { FlowExecutorContext } from '../handler/context/flow-execution-context';
import {
  EngineTimeoutError,
  throwIfExecutionTimeExceeded,
} from '../timeout-validator';

const MAX_RETRIES = 3;
const PROGRESS_DEBOUNCE_MS = 1000;

const runDebouncers = new Map<string, any>();
const updateParameters = new Map<string, UpdateStepProgressParams>();

function getRunDebouncer(runId: string): any {
  let debouncedFunc = runDebouncers.get(runId);

  if (!debouncedFunc) {
    debouncedFunc = debounce(
      async () => {
        const lock = await memoryLock.acquire(runId);
        try {
          await sendUpdateRunRequest(runId);
        } finally {
          await lock.release();
        }
      },
      PROGRESS_DEBOUNCE_MS,
      { leading: false, trailing: true, maxWait: PROGRESS_DEBOUNCE_MS * 3 },
    );
    runDebouncers.set(runId, debouncedFunc);
  }

  return debouncedFunc;
}

export const progressService = {
  sendUpdate: async (params: UpdateStepProgressParams): Promise<void> => {
    throwIfExecutionTimeExceeded();

    const lock = await memoryLock.acquire(params.engineConstants.flowRunId);
    updateParameters.set(params.engineConstants.flowRunId, params);
    await lock.release();

    getRunDebouncer(params.engineConstants.flowRunId)();
  },
  flushProgressUpdate: async (runId: string): Promise<void> => {
    try {
      await runDebouncers.get(runId)?.flush();
    } finally {
      runDebouncers.delete(runId);
      memoryLock.delete(runId);
    }
  },
};

const sendUpdateRunRequest = async (flowRunId: FlowRunId): Promise<void> => {
  const startTime = performance.now();

  const params = updateParameters.get(flowRunId);
  if (params) {
    updateParameters.delete(flowRunId);
  } else {
    return;
  }

  const { flowExecutorContext, engineConstants } = params;
  const url = new URL(`${engineConstants.internalApiUrl}v1/engine/update-run`);

  const request: UpdateRunProgressRequest = {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    executionCorrelationId: engineConstants.executionCorrelationId!,
    runId: engineConstants.flowRunId,
    workerHandlerId: engineConstants.serverHandlerId ?? null,
    runDetails: await flowExecutorContext.toResponse(),
    progressUpdateType: engineConstants.progressUpdateType,
  };

  logger.debug(
    `Sending progress update for ${request.runId} ${request.runDetails.status}`,
  );

  try {
    const bodyAccessKey = await saveRequestBody(request);

    throwIfExecutionTimeExceeded();
    await makeHttpRequest(
      'POST',
      url.toString(),
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engineConstants.engineToken}`,
      }),
      {
        bodyAccessKey,
      } as BodyAccessKeyRequest,
      {
        retries: MAX_RETRIES,
        retryCondition: (error: AxiosError) => {
          throwIfExecutionTimeExceeded();
          return isRetryableError(error);
        },
        retryDelay: (retryCount: number) => (retryCount + 1) * 200, // 200ms, 400ms, 600ms
      },
    );
  } catch (error) {
    if (!(error instanceof EngineTimeoutError)) {
      logger.error(
        `Progress update failed after ${MAX_RETRIES} retries for status ${request.runDetails.status} on run ${flowRunId}`,
        error,
      );
    }

    return;
  }

  const duration = Math.floor(performance.now() - startTime);
  logger.debug(`Progress update request for ${flowRunId} took ${duration}ms`);
};

type UpdateStepProgressParams = {
  engineConstants: EngineConstants;
  flowExecutorContext: FlowExecutorContext;
};
