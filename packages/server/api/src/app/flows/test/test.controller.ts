/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { flowHelper, FlowVersion } from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { flowVersionService } from '../flow-version/flow-version.service';
import { flowService } from '../flow/flow.service';
import { stepRunService } from '../step-run/step-run-service';

export const testController: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.post('/step', TestStepRequest, async (request, reply) => {
    const { flowVersionId, stepId } = request.body;
    const projectId = request.principal.projectId;

    const flowVersion = await flowVersionService.getOneOrThrow(flowVersionId);

    const isValid = await validateFlowBelongToProject(
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
};

async function validateFlowBelongToProject(
  flowVersion: FlowVersion,
  projectId: string,
  reply: any,
): Promise<boolean> {
  const flow = await flowService.getOne({
    id: flowVersion.flowId,
    projectId,
  });
  if (flow === null || flow === undefined) {
    await reply.status(StatusCodes.BAD_REQUEST).send({
      success: false,
      message: 'The flow and version are not associated with the project',
    });

    return false;
  }

  return true;
}

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
