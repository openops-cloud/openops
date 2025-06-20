import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  FlowVersionState,
  MinimalFlow,
  OpenOpsId,
  Permission,
  PrincipalType,
  SERVICE_KEY_SECURITY_OPENAPI,
  StepOutputWithData,
  UpdateFlowVersionRequest,
  flowHelper,
} from '@openops/shared';
import { Type as T } from '@sinclair/typebox';
import { StatusCodes } from 'http-status-codes';
import { flowVersionService } from '../flow-version/flow-version.service';
import { stepRunService } from '../step-run/step-run-service';
import { flowStepTestOutputService } from '../step-test-output/flow-step-test-output.service';
import { flowService } from './flow.service';

export const flowVersionController: FastifyPluginAsyncTypebox = async (
  fastify,
) => {
  fastify.post(
    '/:flowVersionId/trigger',
    {
      schema: {
        description:
          'Updates the trigger configuration for a specific flow version',
        params: Type.Object({
          flowVersionId: Type.String(),
        }),
        body: UpdateFlowVersionRequest,
        response: {
          [StatusCodes.OK]: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { flowVersionId } = request.params;
      const updateData = request.body;
      try {
        const flowVersion = await flowVersionService.getOneOrThrow(
          flowVersionId,
        );
        if (flowVersion.flowId !== updateData.flowId) {
          await reply.status(StatusCodes.BAD_REQUEST).send({
            success: false,
            message:
              'It is not possible to update the flowId of a flow version',
          });
        }
        const flow = await flowService.getOne({
          id: flowVersion.flowId,
          projectId: request.principal.projectId,
        });
        if (flow === null || flow === undefined) {
          await reply.status(StatusCodes.BAD_REQUEST).send({
            success: false,
            message: 'The flow and version are not associated with the project',
          });
        }
        if (flowVersion.state === FlowVersionState.LOCKED) {
          await reply.status(StatusCodes.BAD_REQUEST).send({
            success: false,
            message: 'The flow version is locked',
          });
        }

        if (
          new Date(flowVersion.updated).getTime() >
          new Date(updateData.updateTimestamp).getTime()
        ) {
          await reply.status(StatusCodes.CONFLICT).send({
            success: false,
            message: 'The flow version has been updated by another user',
          });
        }

        const userId = request.principal.id;

        const newFlowVersion = await flowVersionService.updateTrigger(
          flowVersionId,
          updateData.trigger,
          updateData.valid,
          userId,
        );

        await reply.status(StatusCodes.OK).send({
          success: true,
          message: newFlowVersion.updated,
        });
      } catch (error) {
        await reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
          success: false,
          message: (error as Error).message,
        });
      }
    },
  );

  fastify.get(
    '/',
    GetLatestVersionsByConnectionRequestOptions,
    async (request): Promise<MinimalFlow[]> => {
      const { connectionName } = request.query;

      return flowVersionService.getLatestByConnection({
        connectionName,
        projectId: request.principal.projectId,
      });
    },
  );

  fastify.get(
    '/:flowVersionId/test-output',
    {
      config: {
        allowedPrincipals: [PrincipalType.USER],
      },
      schema: {
        description:
          'Retrieves test output data for specified steps in a flow version',
        params: Type.Object({
          flowVersionId: Type.String(),
        }),
        tags: ['flow-step-test-output'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        querystring: Type.Object({
          stepIds: Type.Array(Type.String()),
        }),
      },
    },
    async (request): Promise<Record<OpenOpsId, StepOutputWithData>> => {
      const { stepIds } = request.query;
      const { flowVersionId } = request.params;

      const flowStepTestOutputs = await flowStepTestOutputService.listDecrypted(
        {
          stepIds,
          flowVersionId,
        },
      );
      return Object.fromEntries(
        flowStepTestOutputs.map((flowStepTestOutput) => [
          flowStepTestOutput.stepId as OpenOpsId,
          {
            output: flowStepTestOutput.output,
            lastTestDate: flowStepTestOutput.updated,
          },
        ]),
      );
    },
  );

  fastify.post(
    '/:flowVersionId/test-output',
    SaveTestOutputRequestOptions,
    async (request, reply) => {
      const { flowVersionId } = request.params;
      const { stepId, output } = request.body;

      const flowVersion = await flowVersionService.getOne(flowVersionId);
      if (!flowVersion) {
        await reply.status(StatusCodes.NOT_FOUND).send({
          success: false,
          message: 'The defined flow version was not found',
        });
      }

      const savedOutput = await flowStepTestOutputService.save({
        stepId,
        flowVersionId,
        output,
      });

      await reply.status(StatusCodes.OK).send({
        success: true,
        message: 'Test output saved successfully',
        data: {
          output,
          id: savedOutput.id,
          stepId: savedOutput.stepId,
          flowVersionId: savedOutput.flowVersionId,
        },
      });
    },
  );

  fastify.post(
    '/:flowVersionId/:stepId/test',
    TestStepRequest,
    async (request, reply) => {
      const { flowVersionId, stepId } = request.params;
      const projectId = request.principal.projectId;

      const flowVersion = await flowVersionService.getOneOrThrow(flowVersionId);

      const step = flowHelper
        .getAllSteps(flowVersion.trigger)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .find((step: any) => step.id === stepId);

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
    },
  );
};

const GetLatestVersionsByConnectionRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    permission: Permission.READ_FLOW,
  },
  schema: {
    description:
      'Retrieves all workflows that contain a specific connection. This endpoint returns the latest version of each workflow that uses the specified connection, including minimal workflow information such as ID, name, and version details. Useful for tracking which workflows depend on a particular connection.',
    tags: ['flow-version'],
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    querystring: Type.Object({
      connectionName: Type.String(),
    }),
    response: {
      [StatusCodes.OK]: Type.Array(MinimalFlow),
    },
  },
};

const SaveTestOutputRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    params: Type.Object({
      flowVersionId: Type.String(),
    }),
    tags: ['flow-step-test-output'],
    description:
      'Saves a user-defined test output for a specific step for the defined flow version.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    body: T.Object({
      stepId: T.String(),
      output: T.Unknown(),
    }),
    response: {
      [StatusCodes.OK]: T.Object({
        success: T.Boolean(),
        message: T.String(),
        data: T.Object({
          id: T.String(),
          stepId: T.String(),
          output: T.Unknown(),
          flowVersionId: T.String(),
        }),
      }),
      [StatusCodes.NOT_FOUND]: T.Object({
        success: T.Boolean(),
        message: T.String(),
      }),
    },
  },
};

const TestStepRequest = {
  schema: {
    description:
      'Test a flow step with specified parameters. With this endpoint its possible to validate steps.',
    params: Type.Object({
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
