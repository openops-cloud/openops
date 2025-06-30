import { logger } from '@openops/server-shared';
import { isNil, UpdateRunProgressRequest } from '@openops/shared';
import { Mutex } from 'async-mutex';
import crypto from 'crypto';
import { EngineConstants } from '../handler/context/engine-constants';
import { FlowExecutorContext } from '../handler/context/flow-execution-context';
import { throwIfExecutionTimeExceeded } from '../timeout-validator';

let lastScheduledUpdateId: NodeJS.Timeout | null = null;
let lastActionExecutionTime: number | undefined = undefined;
let lastRequestHash: string | undefined = undefined;
const MAXIMUM_UPDATE_THRESHOLD = 5000; // 5 seconds
const DEBOUNCE_THRESHOLD = 1000; // 1 second
const lock = new Mutex();
const updateLock = new Mutex();

export const progressService = {
  sendUpdate: async (params: UpdateStepProgressParams): Promise<void> => {
    throwIfExecutionTimeExceeded();
    return updateLock.runExclusive(async () => {
      if (lastScheduledUpdateId) {
        clearTimeout(lastScheduledUpdateId);
      }

      const shouldUpdateNow =
        isNil(lastActionExecutionTime) ||
        Date.now() - lastActionExecutionTime > MAXIMUM_UPDATE_THRESHOLD;

      if (shouldUpdateNow || params.updateImmediate) {
        await sendUpdateRunRequest(params);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      lastScheduledUpdateId = setTimeout(async () => {
        await sendUpdateRunRequest(params);
      }, DEBOUNCE_THRESHOLD);
    });
  },
};

const sendUpdateRunRequest = async (
  params: UpdateStepProgressParams,
): Promise<void> => {
  await lock.runExclusive(async () => {
    logger.info('Sending run update run request');
    lastActionExecutionTime = Date.now();
    const { flowExecutorContext, engineConstants } = params;
    const url = new URL(
      `${engineConstants.internalApiUrl}v1/engine/update-run`,
    );

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
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(request))
      .digest('hex');
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
  });
};

type UpdateStepProgressParams = {
  engineConstants: EngineConstants;
  flowExecutorContext: FlowExecutorContext;
  updateImmediate?: boolean;
};
