import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  JobType,
  LATEST_JOB_DATA_SCHEMA_VERSION,
  logger,
} from '@openops/server-shared';
import {
  ALL_PRINCIPAL_TYPES,
  ApplicationError,
  EngineHttpResponse,
  ErrorCode,
  EventPayload,
  Flow,
  FlowId,
  FlowStatus,
  isNil,
  WebhookUrlParams,
} from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { nanoid } from 'nanoid';
import { flowRepo } from '../flows/flow/flow.repo';
import { webhookResponseWatcher } from '../workers/helper/webhook-response-watcher';
import { flowQueue } from '../workers/queue';
import { getJobPriority } from '../workers/queue/queue-manager';

export const webhookController: FastifyPluginAsyncTypebox = async (app) => {
  app.all(
    '/:flowId/sync',
    SyncWebhookRequest,
    async (request: FastifyRequest<{ Params: WebhookUrlParams }>, reply) => {
      const response = await handleWebhook({
        request,
        flowId: request.params.flowId,
        async: false,
        simulate: false,
      });
      await reply
        .status(response.status)
        .headers(response.headers)
        .send(response.body);
    },
  );

  app.all(
    '/:flowId',
    WebhookRequest,
    async (request: FastifyRequest<{ Params: WebhookUrlParams }>, reply) => {
      const response = await handleWebhook({
        request,
        flowId: request.params.flowId,
        async: true,
        simulate: false,
      });
      await reply
        .status(response.status)
        .headers(response.headers)
        .send(response.body);
    },
  );

  app.all('/', WEBHOOK_QUERY_PARAMS, async (request, reply) => {
    const response = await handleWebhook({
      request,
      flowId: request.query.flowId,
      async: true,
      simulate: false,
    });
    await reply
      .status(response.status)
      .headers(response.headers)
      .send(response.body);
  });

  app.all('/:flowId/test', TestWebhookRequest, async (request, reply) => {
    const response = await handleWebhook({
      request,
      flowId: request.params.flowId,
      async: true,
      simulate: true,
    });
    await reply
      .status(response.status)
      .headers(response.headers)
      .send(response.body);
  });
};

async function handleWebhook({
  request,
  flowId,
  async,
  simulate,
}: {
  request: FastifyRequest;
  flowId: string;
  async: boolean;
  simulate: boolean;
}): Promise<EngineHttpResponse> {
  const flow = await getFlowOrThrow(flowId);
  const payload = await convertRequest(request);
  const executionCorrelationId = nanoid();
  const synchronousHandlerId = async
    ? null
    : webhookResponseWatcher.getServerId();
  if (isNil(flow)) {
    return {
      status: StatusCodes.GONE,
      body: {},
      headers: {},
    };
  }
  if (flow.status !== FlowStatus.ENABLED && !simulate) {
    return {
      status: StatusCodes.NOT_FOUND,
      body: {},
      headers: {},
    };
  }
  await flowQueue.add({
    executionCorrelationId,
    type: JobType.WEBHOOK,
    data: {
      projectId: flow.projectId,
      schemaVersion: LATEST_JOB_DATA_SCHEMA_VERSION,
      executionCorrelationId,
      synchronousHandlerId,
      payload,
      flowId: flow.id,
      simulate,
    },
    priority: await getJobPriority(flow.projectId, synchronousHandlerId),
  });
  if (async) {
    return {
      status: StatusCodes.OK,
      body: {},
      headers: {},
    };
  }
  return webhookResponseWatcher.oneTimeListener(executionCorrelationId, true);
}

async function convertRequest(request: FastifyRequest): Promise<EventPayload> {
  const payload: EventPayload = {
    method: request.method,
    headers: request.headers as Record<string, string>,
    body: await convertBody(request),
    queryParams: request.query as Record<string, string>,
  };
  return payload;
}

const convertBody = async (request: FastifyRequest): Promise<unknown> => {
  if (request.isMultipart()) {
    const jsonResult: Record<string, unknown> = {};
    const requestBodyEntries = Object.entries(
      request.body as Record<string, unknown>,
    );

    for (const [key, value] of requestBodyEntries) {
      jsonResult[key] =
        value instanceof Buffer ? value.toString('base64') : value;
    }

    logger.debug({ name: 'WebhookController#convertBody', jsonResult });

    return jsonResult;
  }
  return request.body;
};

const getFlowOrThrow = async (flowId: FlowId): Promise<Flow> => {
  if (isNil(flowId)) {
    logger.error('[WebhookService#getFlowOrThrow] error=flow_id_is_undefined');
    throw new ApplicationError({
      code: ErrorCode.VALIDATION,
      params: {
        message: 'flowId is undefined',
      },
    });
  }

  const flow = await flowRepo().findOneBy({ id: flowId });

  if (isNil(flow)) {
    logger.error(
      `[WebhookService#getFlowOrThrow] error=flow_not_found flowId=${flowId}`,
    );

    throw new ApplicationError({
      code: ErrorCode.FLOW_NOT_FOUND,
      params: {
        id: flowId,
      },
    });
  }

  return flow;
};

const WEBHOOK_PARAMS = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
    skipAuth: true,
  },
  schema: {
    params: WebhookUrlParams,
  },
};

const SyncWebhookRequest = {
  ...WEBHOOK_PARAMS,
  schema: {
    ...WEBHOOK_PARAMS.schema,
    description:
      'Process webhook requests synchronously for a specific flow. This endpoint handles incoming webhook requests and executes the associated flow immediately, waiting for the execution to complete before responding. Useful for scenarios requiring immediate feedback or when the webhook caller needs the flow execution result.',
  },
};

const WebhookRequest = {
  ...WEBHOOK_PARAMS,
  schema: {
    ...WEBHOOK_PARAMS.schema,
    description:
      'Process webhook requests asynchronously for a specific flow. This endpoint handles incoming webhook requests and queues the associated flow for execution, responding immediately without waiting for the flow to complete. Ideal for high-volume webhook scenarios where immediate acknowledgment is sufficient.',
  },
};

const TestWebhookRequest = {
  ...WEBHOOK_PARAMS,
  schema: {
    ...WEBHOOK_PARAMS.schema,
    description:
      'Test webhook functionality for a specific flow. This endpoint allows sending test webhook requests to verify flow configuration, trigger conditions, and execution behavior without affecting production data. Useful for development and debugging purposes.',
  },
};

const WEBHOOK_QUERY_PARAMS = {
  ...WEBHOOK_PARAMS,
  schema: {
    querystring: WebhookUrlParams,
    description:
      'Process webhook requests using query parameters. This endpoint provides an alternative way to trigger flows via webhooks, allowing the flow ID to be specified in the query string instead of the URL path. Supports both synchronous and asynchronous processing modes.',
  },
};
