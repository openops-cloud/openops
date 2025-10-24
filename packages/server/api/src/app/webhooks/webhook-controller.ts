import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { ALL_PRINCIPAL_TYPES, WebhookUrlParams } from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { handleWebhook, handleWebhookSimulation } from './webhook-handler';

export const webhookController: FastifyPluginAsyncTypebox = async (app) => {
  app.all(
    '/:flowId/sync',
    SyncWebhookRequest,
    async (request: FastifyRequest<{ Params: WebhookUrlParams }>, reply) => {
      const response = await handleWebhook({
        request,
        flowId: request.params.flowId,
        async: false,
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
    });
    await reply
      .status(response.status)
      .headers(response.headers)
      .send(response.body);
  });

  app.all('/:flowId/test', TestWebhookRequest, async (request, reply) => {
    const response = await handleWebhookSimulation(
      request,
      request.params.flowId,
    );

    await reply
      .status(response.status)
      .headers(response.headers)
      .send(response.body);
  });
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
