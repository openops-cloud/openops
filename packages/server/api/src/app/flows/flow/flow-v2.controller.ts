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
  flowHelper,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization';
import { flowService } from './flow.service';

export const flowV2Controller: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject);

  app.post('/:id/steps', AddStepRequestOptions, async (request) => {
    logger.info('V2 Add Step endpoint called', {
      flowId: request.params.id,
      userId: request.principal.id,
      projectId: request.principal.projectId,
      requestBody: request.body,
    });

    try {
      const userId = request.principal.id;
      const flowId = request.params.id;
      const projectId = request.principal.projectId;

      // Get current flow to debug step names
      const currentFlow = await flowService.getOnePopulatedOrThrow({
        id: flowId,
        projectId,
      });

      const allSteps = flowHelper.getAllSteps(currentFlow.version.trigger);
      const stepNames = allSteps.map((step) => ({
        name: step.name,
        id: step.id,
        type: step.type,
        displayName: step.displayName,
      }));

      logger.info('Available steps in workflow', {
        flowId,
        stepNames,
        requestedParentStep: request.body.parentStep,
      });

      logger.info('Calling flowService.update', {
        flowId,
        userId,
        projectId,
        operationType: FlowOperationType.ADD_ACTION,
        parentStep: request.body.parentStep,
      });

      const updatedFlow = await flowService.update({
        id: flowId,
        userId,
        projectId,
        operation: {
          type: FlowOperationType.ADD_ACTION,
          request: request.body,
        },
      });

      logger.info('Flow service update completed successfully', {
        flowId,
        updatedFlowId: updatedFlow.id,
        hasNextAction: !!updatedFlow.version?.trigger?.nextAction,
        nextActionName: updatedFlow.version?.trigger?.nextAction?.name,
      });

      return updatedFlow;
    } catch (error) {
      logger.error('Error in V2 Add Step endpoint', {
        flowId: request.params.id,
        userId: request.principal.id,
        projectId: request.principal.projectId,
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
