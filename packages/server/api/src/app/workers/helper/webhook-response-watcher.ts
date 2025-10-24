import { AppSystemProp, logger, system } from '@openops/server-shared';
import { EngineHttpResponse, openOpsId } from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { pubsub } from '../../helper/pubsub';

const listeners = new Map<
  string,
  (flowResponse: EngineResponseWithId) => void
>();
const WEBHOOK_TIMEOUT_MS =
  (system.getNumber(AppSystemProp.WEBHOOK_TIMEOUT_SECONDS) ?? 30) * 1000;
const SERVER_ID = openOpsId();

export const webhookResponseWatcher = {
  getServerId(): string {
    return SERVER_ID;
  },
  async init(): Promise<void> {
    await pubsub().subscribe(
      `engine-run:sync:${SERVER_ID}`,
      (_channel, message) => {
        const parsedMessage: EngineResponseWithId = JSON.parse(message);
        const listener = listeners.get(parsedMessage.flowRunId);

        logger.info('Webhook response received.', {
          flowRunId: parsedMessage.flowRunId,
        });

        if (listener) {
          listener(parsedMessage);
        }
      },
    );

    logger.info('Webhook response watcher initialized successfully.', {
      serverId: SERVER_ID,
    });
  },
  async oneTimeListener(
    flowRunId: string,
    timeoutRequest: boolean,
  ): Promise<EngineHttpResponse> {
    return new Promise((resolve) => {
      let timeout: NodeJS.Timeout;
      if (timeoutRequest) {
        const defaultResponse: EngineHttpResponse = {
          status: StatusCodes.REQUEST_TIMEOUT,
          body: {
            message: 'Request timed out',
          },
          headers: {},
        };

        timeout = setTimeout(() => {
          listeners.delete(flowRunId);
          resolve(defaultResponse);
        }, WEBHOOK_TIMEOUT_MS);
      }

      const responseHandler = (flowResponse: EngineResponseWithId) => {
        if (timeout) {
          clearTimeout(timeout);
        }

        listeners.delete(flowRunId);
        resolve(flowResponse.httpResponse);
      };

      logger.info(`Add listener for the flow run ${flowRunId}.`, {
        flowRunId,
      });

      listeners.set(flowRunId, responseHandler);
    });
  },
  async publish(
    flowRunId: string,
    workerServerId: string,
    httpResponse: EngineHttpResponse,
  ): Promise<void> {
    logger.info(`Publishing webhook response for flow run ${flowRunId}.`, {
      flowRunId,
    });

    const message: EngineResponseWithId = {
      flowRunId,
      httpResponse,
    };

    await pubsub().publish(
      `engine-run:sync:${workerServerId}`,
      JSON.stringify(message),
    );
  },
  async shutdown(): Promise<void> {
    await pubsub().unsubscribe(`engine-run:sync:${SERVER_ID}`);
  },
};

export type EngineResponseWithId = {
  httpResponse: EngineHttpResponse;
  flowRunId: string;
};
