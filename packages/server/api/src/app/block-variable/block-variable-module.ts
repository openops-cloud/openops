import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { encodeStepOutputs, flowHelper } from '@openops/shared';
import { engineRunner } from 'server-worker';
import { accessTokenManager } from '../authentication/lib/access-token-manager';
import { flowService } from '../flows/flow/flow.service';
import { flowStepTestOutputService } from '../flows/step-test-output/flow-step-test-output.service';

export const blockVariableModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(blockVariableController, { prefix: '/v1/block-variable' });
};

const blockVariableController: FastifyPluginAsyncTypebox = async (app) => {
  app.post('/execute-variable', ExecuteVariableRequest, async (req) => {
    const request = req.body;
    const { projectId } = req.principal;

    const flow = await flowService.getOnePopulatedOrThrow({
      projectId,
      id: request.flowId,
      versionId: request.flowVersionId,
    });

    const engineToken = await accessTokenManager.generateEngineToken({
      projectId,
    });

    const stepIds = flowHelper.getAllStepIds(flow.version.trigger);
    const outputs = await flowStepTestOutputService.listEncrypted({
      flowVersionId: request.flowVersionId,
      stepIds,
    });

    const stepTestOutputs = encodeStepOutputs(outputs);

    const { result } = await engineRunner.executeVariable(engineToken, {
      variableExpression: request.variableExpression,
      flowVersion: flow.version,
      projectId,
      stepName: request.stepName,
      stepTestOutputs,
    });

    return result;
  });
};

const ExecuteVariableRequest = {
  schema: {
    description:
      "Execute variable resolution to get the resolved value of a variable expression within a flow context. This endpoint resolves variables like {{trigger['headers']}} or {{step_2}} and returns both the resolved value and a censored version.",
    body: Type.Object({
      flowId: Type.String({
        description: 'The ID of the flow containing the variable context',
      }),
      flowVersionId: Type.String({
        description: 'The specific version ID of the flow',
      }),
      variableExpression: Type.String({
        description:
          'The variable expression to resolve (e.g., "{{trigger[\'headers\']}}and we also consider{{step_2}}")',
      }),
      stepName: Type.Optional(
        Type.String({
          description:
            'Optional step name to exclude from the execution context',
        }),
      ),
    }),
    response: {
      200: Type.Object({
        success: Type.Boolean({
          description: 'Whether the variable resolution was successful',
        }),
        resolvedValue: Type.Unknown({
          description: 'The resolved value of the variable expression',
        }),
        censoredValue: Type.Unknown({
          description: 'The censored version with sensitive data redacted',
        }),
        error: Type.Optional(
          Type.String({
            description: 'Error message if resolution failed',
          }),
        ),
      }),
    },
  },
};
