import { makeHttpRequest } from '@openops/common';
import { hashUtils, logger } from '@openops/server-shared';
import { UpdateRunProgressRequest } from '@openops/shared';
import { Mutex } from 'async-mutex';
import { AxiosHeaders } from 'axios';
import { EngineConstants } from '../handler/context/engine-constants';
import { FlowExecutorContext } from '../handler/context/flow-execution-context';
import { throwIfExecutionTimeExceeded } from '../timeout-validator';

const MAX_RETRIES = 3;

let lastRequestHash: string | undefined = undefined;
const lock = new Mutex();

export const progressService = {
  sendUpdate: async (params: UpdateStepProgressParams): Promise<void> => {
    return lock.runExclusive(async () => {
      throwIfExecutionTimeExceeded();
      await sendUpdateRunRequest(params);
    });
  },
};

const sendUpdateRunRequest = async (
  params: UpdateStepProgressParams,
): Promise<void> => {
  const { flowExecutorContext, engineConstants } = params;
  const url = new URL(`${engineConstants.internalApiUrl}v1/engine/update-run`);

  if (!engineConstants.executionCorrelationId) {
    // This should never happen
    logger.error(
      'The executionCorrelationId is not defined when sending an update run progress request.',
    );
    throw new Error(
      'The executionCorrelationId is not defined when sending an update run progress request.',
    );
  }

  const request: UpdateRunProgressRequest = {
    executionCorrelationId: engineConstants.executionCorrelationId,
    runId: engineConstants.flowRunId,
    workerHandlerId: engineConstants.serverHandlerId ?? null,
    runDetails: await flowExecutorContext.toResponse(),
    progressUpdateType: engineConstants.progressUpdateType,
  };

  logger.debug(
    `Sending progress update for ${request.runId} ${request.runDetails.status}`,
  );

  // Request deduplication using hash comparison
  const requestHash = hashUtils.hashObject(request, (key, value) => {
    if (key === 'duration') return undefined;
    return value;
  });

  if (requestHash === lastRequestHash) {
    return;
  }

  lastRequestHash = requestHash;

  try {
    await makeHttpRequest(
      'POST',
      url.toString(),
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engineConstants.engineToken}`,
      }),
      request,
      {
        retries: MAX_RETRIES,
        retryDelay: (retryCount: number) => {
          return (retryCount + 1) * 1000; // 1s, 2s, 3s
        },
      },
    );
  } catch (error) {
    logger.error(
      `Progress update failed after ${MAX_RETRIES} retries for status ${request.runDetails.status} on run ${request.runId}`,
      error,
    );
  }
};

type UpdateStepProgressParams = {
  engineConstants: EngineConstants;
  flowExecutorContext: FlowExecutorContext;
};
