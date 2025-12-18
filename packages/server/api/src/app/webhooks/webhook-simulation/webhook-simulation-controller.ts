import {
  FastifyPluginCallbackTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { PrincipalType } from '@openops/shared';
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
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    body: Type.Object({
      flowId: Type.String(),
    }),
    description:
      'Create a webhook simulation for testing purposes. This endpoint allows you to simulate webhook requests for a specific flow, enabling testing of webhook-triggered flows without actual external requests. The simulation creates a test environment where you can verify flow behavior and response handling.',
  },
};

const GetWebhookSimulationRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    querystring: Type.Object({
      flowId: Type.String(),
    }),
    description:
      'Get the current webhook simulation status for a specific flow. This endpoint retrieves information about an active webhook simulation, including its configuration, status, and any associated test data. Useful for monitoring and debugging webhook simulations.',
  },
};

const DeleteWebhookSimulationRequest = {
  ...GetWebhookSimulationRequest,
  schema: {
    ...GetWebhookSimulationRequest.schema,
    description:
      'Delete an active webhook simulation for a specific flow. This endpoint terminates any ongoing webhook simulation, cleans up associated resources, and removes test data. Use this when you are done testing or need to reset the simulation state.',
  },
};
