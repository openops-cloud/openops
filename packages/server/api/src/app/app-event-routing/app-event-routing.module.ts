import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { slack } from '@openops/block-slack';
import { Block } from '@openops/blocks-framework';
import {
  JobType,
  LATEST_JOB_DATA_SCHEMA_VERSION,
  logger,
  rejectedPromiseHandler,
} from '@openops/server-shared';
import {
  ALL_PRINCIPAL_TYPES,
  ApplicationError,
  assertNotNullOrUndefined,
  ErrorCode,
  isNil,
} from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { nanoid } from 'nanoid';
import { flowQueue } from '../workers/queue';
import { DEFAULT_PRIORITY } from '../workers/queue/queue-manager';
import { appEventRoutingService } from './app-event-routing.service';

const appWebhooks: Record<string, Block> = {
  slack,
};
const blockNames: Record<string, string> = {
  slack: '@openops/block-slack',
};

export const appEventRoutingModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(appEventRoutingController, { prefix: '/v1/app-events' });
};

export const appEventRoutingController: FastifyPluginAsyncTypebox = async (
  fastify,
) => {
  fastify.all(
    '/:blockUrl',
    {
      config: {
        rawBody: true,
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,
      },
    },
    async (
      request: FastifyRequest<{
        Body: unknown;
        Params: {
          blockUrl: string;
        };
      }>,
      requestReply,
    ) => {
      const blockUrl = request.params.blockUrl;
      const payload = {
        headers: request.headers as Record<string, string>,
        body: request.body,
        rawBody: request.rawBody,
        method: request.method,
        queryParams: request.query as Record<string, string>,
      };
      const block = appWebhooks[blockUrl];
      if (isNil(block)) {
        throw new ApplicationError({
          code: ErrorCode.BLOCK_NOT_FOUND,
          params: {
            blockName: blockUrl,
            blockVersion: 'latest',
            message: 'Blocks is not found in app event routing',
          },
        });
      }
      const appName = blockNames[blockUrl];
      assertNotNullOrUndefined(block.events, 'Event is possible in this block');
      const { reply, event, identifierValue } = block.events.parseAndReply({
        payload,
      });
      if (!isNil(reply)) {
        logger.info(
          {
            reply,
            block: blockUrl,
          },
          '[AppEventRoutingController#event] reply',
        );
        return requestReply
          .status(StatusCodes.OK)
          .headers(reply?.headers ?? {})
          .send(reply?.body ?? {});
      }
      logger.info(
        {
          event,
          identifierValue,
        },
        '[AppEventRoutingController#event] event',
      );
      if (isNil(event) || isNil(identifierValue)) {
        return requestReply.status(StatusCodes.BAD_REQUEST).send({});
      }
      const listeners = await appEventRoutingService.listListeners({
        appName,
        event,
        identifierValue,
      });
      const eventsQueue = listeners.map(async (listener) => {
        const executionCorrelationId = nanoid();
        return flowQueue.add({
          executionCorrelationId,
          type: JobType.WEBHOOK,
          data: {
            projectId: listener.projectId,
            schemaVersion: LATEST_JOB_DATA_SCHEMA_VERSION,
            executionCorrelationId,
            synchronousHandlerId: null,
            payload,
            flowId: listener.flowId,
            simulate: false,
          },
          priority: DEFAULT_PRIORITY,
        });
      });
      rejectedPromiseHandler(Promise.all(eventsQueue));
      return requestReply.status(StatusCodes.OK).send({});
    },
  );
};
