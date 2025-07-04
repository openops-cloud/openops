import { hashUtils, logger } from '@openops/server-shared';
import { UpdateRunProgressRequest } from '@openops/shared';
import { Mutex } from 'async-mutex';
import { EngineConstants } from '../handler/context/engine-constants';
import { FlowExecutorContext } from '../handler/context/flow-execution-context';
import { throwIfExecutionTimeExceeded } from '../timeout-validator';

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

  // Request deduplication using hash comparison
  const requestHash = hashUtils.hashObject(request, (key, value) => {
    if (key === 'duration') return undefined;
    return value;
  });

  if (requestHash === lastRequestHash) {
    return;
  }

  lastRequestHash = requestHash;

  await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${engineConstants.engineToken}`,
    },
    body: JSON.stringify(request),
  });
};

type UpdateStepProgressParams = {
  engineConstants: EngineConstants;
  flowExecutorContext: FlowExecutorContext;
};
