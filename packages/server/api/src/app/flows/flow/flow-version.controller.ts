import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  ApplicationError,
  ErrorCode,
  FlowVersionState,
  MinimalFlow,
  OpenOpsId,
  Permission,
  PrincipalType,
  SERVICE_KEY_SECURITY_OPENAPI,
  StepOutputWithData,
  UpdateFlowVersionRequest,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { validateFlowVersionBelongsToProject } from '../common/flow-version-validation';
import { flowVersionService } from '../flow-version/flow-version.service';
import { flowStepTestOutputService } from '../step-test-output/flow-step-test-output.service';

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

        const isValid = await validateFlowVersionBelongsToProject(
          flowVersion,
          request.principal.projectId,
          reply,
        );

        if (!isValid) {
          return;
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
            input: flowStepTestOutput.input,
            output: flowStepTestOutput.output,
            lastTestDate: flowStepTestOutput.updated,
            success: flowStepTestOutput.success,
          },
        ]),
      );
    },
  );

  fastify.post(
    '/:flowVersionId/test-output',
    {
      config: {
        allowedPrincipals: [PrincipalType.USER],
      },
      schema: {
        description:
          'Inject test/sample output and input for a step in a flow version',
        params: Type.Object({
          flowVersionId: Type.String(),
        }),
        body: Type.Object({
          stepId: Type.String(),
          input: Type.Any(),
          output: Type.Any(),
          success: Type.Boolean(),
        }),
        response: {
          [StatusCodes.OK]: Type.Object({
            success: Type.Boolean(),
            id: Type.String(),
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
    },
    async (request, reply) => {
      const { flowVersionId } = request.params;
      const { stepId, input, output, success } = request.body;
      try {
        const flowVersion = await flowVersionService.getOneOrThrow(
          flowVersionId,
        );
        const isValid = await validateFlowVersionBelongsToProject(
          flowVersion,
          request.principal.projectId,
          reply,
        );
        if (!isValid) {
          return;
        }
        const saved = await flowStepTestOutputService.save({
          stepId,
          flowVersionId,
          input,
          output,
          success,
        });
        await reply.status(StatusCodes.OK).send({
          success: true,
          id: saved.id,
        });
      } catch (error) {
        if (
          error instanceof ApplicationError &&
          error.error.code === ErrorCode.ENTITY_NOT_FOUND
        ) {
          await reply.status(StatusCodes.NOT_FOUND).send({
            success: false,
            message: 'The defined flow version was not found',
          });
        } else {
          await reply.status(StatusCodes.BAD_REQUEST).send({
            success: false,
            message: (error as Error).message,
          });
        }
      }
    },
  );
};

const GetLatestVersionsByConnectionRequestOptions = {
  config: {
    allowedPrincipals: [
      PrincipalType.MCP,
      PrincipalType.USER,
      PrincipalType.SERVICE,
    ],
    permission: Permission.READ_FLOW,
  },
  schema: {
    operationId: 'List Flows By Connection',
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
