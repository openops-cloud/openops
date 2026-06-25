import { AppSystemProp, logger, system } from '@openops/server-shared';
import { EngineHttpResponse, openOpsId } from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { pubsub } from '../../helper/pubsub';

const listeners = new Map<
  string,
  (flowResponse: EngineResponseWithId) => Promise<void>
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
      async (_channel, message): Promise<void> => {
        const parsedMessage: EngineResponseWithId = JSON.parse(message);
        const listener = listeners.get(parsedMessage.flowRunId);

        logger.info('Webhook response received.', {
          flowRunId: parsedMessage.flowRunId,
        });

        if (listener) {
          await listener(parsedMessage);
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

      const responseHandler = async (
        flowResponse: EngineResponseWithId,
      ): Promise<void> => {
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
  oneTimeListenerCustom(
    flowRunId: string,
    handler: (flowResponse: EngineResponseWithId) => Promise<void>,
  ): void {
    logger.info(`Add listener for the flow run ${flowRunId}.`, {
      flowRunId,
    });

    listeners.set(
      flowRunId,
      async (flowResponse: EngineResponseWithId): Promise<void> => {
        listeners.delete(flowRunId);
        try {
          await handler(flowResponse);
        } catch (error) {
          logger.error(
            `Error while handling webhook response for flow run ${flowRunId}.`,
            {
              flowRunId,
              error,
            },
          );
        }
      },
    );
  },
  removeListener(flowRunId: string): void {
    logger.info(`Remove listener for the flow run ${flowRunId}.`, {
      flowRunId,
    });

    listeners.delete(flowRunId);
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
