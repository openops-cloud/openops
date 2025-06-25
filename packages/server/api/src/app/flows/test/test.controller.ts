/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  flowHelper,
  PrincipalType,
  TestTriggerRequestBody,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { validateFlowVersionBelongsToProject } from '../common/flow-version-validation';
import { flowRunService } from '../flow-run/flow-run-service';
import { flowVersionService } from '../flow-version/flow-version.service';
import { stepRunService } from '../step-run/step-run-service';
import { testTriggerService } from '../test-trigger/test-trigger-service';

export const testController: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.post('/step', TestStepRequest, async (request, reply) => {
    const { flowVersionId, stepId } = request.body;
    const projectId = request.principal.projectId;

    const flowVersion = await flowVersionService.getOneOrThrow(flowVersionId);

    const isValid = await validateFlowVersionBelongsToProject(
      flowVersion,
      projectId,
      reply,
    );

    if (!isValid) {
      return;
    }

    const step = flowHelper
      .getAllSteps(flowVersion.trigger)
      .find((step) => step.id === stepId);

    if (!step) {
      await reply.status(StatusCodes.NOT_FOUND).send({
        success: false,
        output: 'Step not found',
      });
      return;
    }

    try {
      const result = await stepRunService.create({
        userId: request.principal.id,
        projectId,
        flowVersionId: flowVersion.id,
        stepName: step.name,
      });

      await reply.send({
        success: result.success,
        output: result.output ?? {},
      });
    } catch (error) {
      await reply.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        output:
          error instanceof Error
            ? error.message
            : 'An error occurred while testing the step',
      });
    }
  });

  fastify.post('/flow', TestWorkflowRequest, async (request, reply) => {
    const { flowVersionId } = request.body;
    const projectId = request.principal.projectId;

    try {
      const flowVersion = await flowVersionService.getOneOrThrow(flowVersionId);

      const isValid = await validateFlowVersionBelongsToProject(
        flowVersion,
        projectId,
        reply,
      );

      if (!isValid) {
        return;
      }
      const flowRun = await flowRunService.test({
        projectId,
        flowVersionId: flowVersion.id,
      });

      await reply.send({
        success: true,
        flowRunId: flowRun.id,
        status: flowRun.status,
        message: 'Workflow test started successfully',
      });
    } catch (error) {
      await reply.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'An error occurred while starting the workflow execution.',
      });
    }
  });

  fastify.post('/trigger', TestTriggerRequest, async (request) => {
    const { projectId } = request.principal;
    const { flowId, flowVersionId, testStrategy } = request.body;

    return testTriggerService.test({
      flowId,
      flowVersionId,
      projectId,
      testStrategy,
    });
  });
};

const TestStepRequest = {
  schema: {
    description:
      'Test a workflow step with specified parameters. With this endpoint its possible to validate steps.',
    body: Type.Object({
      flowVersionId: Type.String(),
      stepId: Type.String(),
    }),
    response: {
      [StatusCodes.OK]: Type.Object({
        success: Type.Boolean(),
        output: Type.Any(),
      }),
      [StatusCodes.BAD_REQUEST]: Type.Object({
        success: Type.Boolean(),
        output: Type.String(),
      }),
      [StatusCodes.NOT_FOUND]: Type.Object({
        success: Type.Boolean(),
        output: Type.String(),
      }),
    },
  },
};

const TestWorkflowRequest = {
  schema: {
    description:
      'Start a test for a workflow using a defined workflow version. This endpoint starts a test run of the entire workflow.',
    body: Type.Object({
      flowVersionId: Type.String(),
    }),
    response: {
      [StatusCodes.OK]: Type.Object({
        success: Type.Boolean(),
        flowRunId: Type.String(),
        status: Type.String(),
        message: Type.String(),
      }),
      [StatusCodes.BAD_REQUEST]: Type.Object({
        success: Type.Boolean(),
        message: Type.String(),
      }),
      [StatusCodes.NOT_FOUND]: Type.Object({
        success: Type.Boolean(),
        message: Type.String(),
      }),
    },
  },
};

const TestTriggerRequest = {
  schema: {
    description:
      'Test a flow trigger with specified parameters. This endpoint allows users to validate and test flow triggers before deploying them to production, helping ensure proper configuration and behavior.',
    body: TestTriggerRequestBody,
  },
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
};
