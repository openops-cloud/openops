import {
  FastifyPluginCallbackTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { ALL_PRINCIPAL_TYPES } from '@openops/shared';
import { webhookSimulationService } from './webhook-simulation-service';

export const webhookSimulationController: FastifyPluginCallbackTypebox = (
  app,
  _opts,
  done,
) => {
  app.post('/', CreateWebhookSimulationRequest, async (req) => {
    const { flowId } = req.body;
    const { projectId } = req.principal;

    return webhookSimulationService.create({
      flowId,
      projectId,
    });
  });

  app.get('/', GetWebhookSimulationRequest, async (req) => {
    const { flowId } = req.query;
    const { projectId } = req.principal;

    return webhookSimulationService.getOrThrow({
      flowId,
      projectId,
    });
  });

  app.delete('/', DeleteWebhookSimulationRequest, async (req) => {
    const { flowId } = req.query;
    const { projectId } = req.principal;

    return webhookSimulationService.delete({
      flowId,
      projectId,
    });
  });

  done();
};

const CreateWebhookSimulationRequest = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
  },
  schema: {
    body: Type.Object({
      flowId: Type.String(),
    }),
    description:
      'Create a webhook simulation for testing purposes. This endpoint allows you to simulate webhook requests for a specific flow, enabling testing of webhook-triggered flows without actual external requests.',
  },
};

const GetWebhookSimulationRequest = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
  },
  schema: {
    querystring: Type.Object({
      flowId: Type.String(),
    }),
    description:
      'Get the current webhook simulation status for a specific flow. This endpoint retrieves information about an active webhook simulation, including its configuration and status.',
  },
};

const DeleteWebhookSimulationRequest = {
  ...GetWebhookSimulationRequest,
  schema: {
    ...GetWebhookSimulationRequest.schema,
    description:
      'Delete an active webhook simulation for a specific flow. This endpoint terminates any ongoing webhook simulation and cleans up associated resources.',
  },
};
