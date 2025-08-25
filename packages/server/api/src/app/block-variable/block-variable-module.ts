import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  convertStepOutputs,
  EndpointScope,
  flowHelper,
  PrincipalType,
} from '@openops/shared';
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

    const stepTestOutputs = convertStepOutputs(outputs);

    const { result } = await engineRunner.executeVariable(engineToken, {
      variableExpression: request.variableExpression,
      flowVersion: flow.version,
      projectId,
      stepName: request.stepName ?? '',
      stepTestOutputs,
    });

    return {
      success: result.success,
      value: result.censoredValue,
      error: result.error,
    };
  });
};

const ExecuteVariableRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    scope: EndpointScope.ORGANIZATION,
  },
  schema: {
    description:
      "Execute variable resolution to get the resolved value of a variable expression within a flow context. This endpoint resolves variables like {{trigger['headers']}} or {{step_2}} and returns the resolved value.",
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
        maxLength: 10000,
      }),
      stepName: Type.Optional(
        Type.String({
          description:
            'Optional step name for which the variable expression should be resolved',
          maxLength: 100,
        }),
      ),
    }),
    response: {
      200: Type.Object({
        success: Type.Boolean({
          description: 'Whether the variable resolution was successful',
        }),
        value: Type.Unknown({
          description: 'The resolved value of the variable expression',
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
