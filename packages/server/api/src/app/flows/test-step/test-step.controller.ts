import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Action } from '@openops/shared';
import { Type } from '@sinclair/typebox';
import { StatusCodes } from 'http-status-codes';
import { flowVersionService } from '../flow-version/flow-version.service';
import { stepRunService } from '../step-run/step-run-service';

export const testStepController: FastifyPluginAsyncTypebox = async (app) => {
  app.post('/:workflowId/:stepId', TestStepRequest, async (request, reply) => {
    const { workflowId, stepId } = request.params;
    const projectId = request.principal.projectId;

    const flowVersion = await flowVersionService.getFlowVersionOrThrow({
      flowId: workflowId,
      versionId: undefined,
    });

    const step = flowVersion.trigger.nextAction as Action | undefined;
    if (!step || step.id !== stepId) {
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

const TestStepRequest = {
  schema: {
    description:
      'Test a flow step with specified parameters. With this endpoint its possible to validate steps.',
    params: Type.Object({
      workflowId: Type.String(),
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
