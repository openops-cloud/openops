import { WebhookResponseHook } from '@openops/blocks-framework';
import { makeHttpRequest } from '@openops/common';
import { logger } from '@openops/server-shared';
import { EngineHttpResponse, isNil } from '@openops/shared';
import { AxiosError, AxiosHeaders } from 'axios';
import { isRetryableError } from 'axios-retry';
import { EngineConstants } from './context/engine-constants';

const MAX_RETRIES = 3;

export function createWebhookResponseHook(
  constants: EngineConstants,
): WebhookResponseHook {
  return async (response: EngineHttpResponse): Promise<void> => {
    if (
      isNil(constants.serverHandlerId) ||
      isNil(constants.executionCorrelationId)
    ) {
      logger.warn(
        'Skipping webhook response due to missing required identifiers',
        {
          flowRunId: constants.flowRunId,
        },
      );
      return;
    }

    const url = new URL(
      `${constants.internalApiUrl}v1/engine/send-webhook-response`,
    );

    await sendWebhookResponse(response, constants, url);
  };
}

async function sendWebhookResponse(
  response: EngineHttpResponse,
  constants: EngineConstants,
  url: URL,
): Promise<void> {
  await makeHttpRequest(
    'POST',
    url.toString(),
    new AxiosHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${constants.engineToken}`,
    }),
    {
      workerHandlerId: constants.serverHandlerId,
      flowRunId: constants.flowRunId,
      response,
    },
    {
      retries: MAX_RETRIES,
      retryCondition: async (error: AxiosError) => {
        return isRetryableError(error);
      },
      retryDelay: (retryCount: number) => (retryCount + 1) * 200, // 200ms, 400ms, 600ms
    },
  );
}
