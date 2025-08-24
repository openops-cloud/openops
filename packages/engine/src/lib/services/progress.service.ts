import { makeHttpRequest } from '@openops/common';
import {
  BodyAccessKeyRequest,
  hashUtils,
  logger,
  saveRequestBody,
} from '@openops/server-shared';
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
    throwIfExecutionTimeExceeded();
    return lock.runExclusive(async () => {
      await sendUpdateRunRequest(params);
    });
  },
};

const sendUpdateRunRequest = async (
  params: UpdateStepProgressParams,
): Promise<void> => {
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
    const resourceKey = await saveRequestBody(request.runId, request);

    await makeHttpRequest(
      'POST',
      url.toString(),
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${engineConstants.engineToken}`,
      }),
      {
        bodyAccessKey: resourceKey,
      } as BodyAccessKeyRequest,
      {
        retries: MAX_RETRIES,
        retryDelay: (retryCount: number) => {
          return (retryCount + 1) * 200; // 200ms, 400ms, 600ms
        },
      },
    );
  } catch (error) {
    logger.error(
      `Progress update failed after ${MAX_RETRIES} retries for status ${request.runDetails.status} on run ${request.runId}`,
      { error },
    );
  }
};

type UpdateStepProgressParams = {
  engineConstants: EngineConstants;
  flowExecutorContext: FlowExecutorContext;
};
