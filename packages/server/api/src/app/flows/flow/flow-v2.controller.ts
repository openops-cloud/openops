import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { logger } from '@openops/server-shared';
import {
  AddActionRequest,
  FlowOperationType,
  OpenOpsId,
  Permission,
  PopulatedFlow,
  PrincipalType,
  SERVICE_KEY_SECURITY_OPENAPI,
  UpdateActionRequest,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization';
import { flowService } from './flow.service';

export const flowV2Controller: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject);

  app.post('/:id/steps', AddStepRequestOptions, async (request) => {
    try {
      const userId = request.principal.id;
      const flowId = request.params.id;
      const projectId = request.principal.projectId;

      const updatedFlow = await flowService.update({
        id: flowId,
        userId,
        projectId,
        operation: {
          type: FlowOperationType.ADD_ACTION,
          request: request.body,
        },
      });

      return updatedFlow;
    } catch (error) {
      logger.error('Error adding step to workflow.', {
        body: request.body,
        flowId: request.params.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

  app.put('/:id/steps/:stepName', UpdateStepRequestOptions, async (request) => {
    try {
      const userId = request.principal.id;
      const flowId = request.params.id;
      const stepName = request.params.stepName;
      const projectId = request.principal.projectId;

      const updatedFlow = await flowService.update({
        id: flowId,
        userId,
        projectId,
        operation: {
          type: FlowOperationType.UPDATE_ACTION,
          request: {
            ...request.body,
            name: stepName,
          },
        },
      });

      return updatedFlow;
    } catch (error) {
      logger.error('Error in V2 Update Step endpoint', {
        body: request.body,
        flowId: request.params.id,
        stepName: request.params.stepName,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  });
};

const AddStepRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    permission: Permission.UPDATE_FLOW_STATUS,
  },
  schema: {
    operationId: 'Add Workflow Step',
    tags: ['flows-v2'],
    description:
      'Add a new step to a workflow. This endpoint allows you to add actions, triggers, or other step types to an existing workflow. The step will be added at the specified location relative to the parent step. Note: The parentStep parameter should be the name of the step (e.g., "step_1", "step_3", "trigger"), not the step ID.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: Type.Object({
      id: OpenOpsId,
    }),
    body: AddActionRequest,
    response: {
      [StatusCodes.OK]: PopulatedFlow,
    },
  },
};

const UpdateStepRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    permission: Permission.UPDATE_FLOW_STATUS,
  },
  schema: {
    tags: ['flows-v2'],
    description:
      'Update an existing step in a workflow. This endpoint allows you to update the properties of an existing step in the workflow.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: Type.Object({
      id: OpenOpsId,
      stepName: OpenOpsId,
    }),
    body: UpdateActionRequest,
    response: {
      [StatusCodes.OK]: PopulatedFlow,
    },
  },
};
