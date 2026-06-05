import {
  AuthorizationScope,
  EngineOperationType,
  PrincipalType,
  RouteAccessType,
} from '@openops/shared';
import { Type } from '@sinclair/typebox';
import { FastifyPluginAsync } from 'fastify';
import { engineRunner } from './index';

const ExecuteBody = Type.Object({
  operation: Type.Enum(EngineOperationType),
  engineToken: Type.Optional(Type.String()),
  input: Type.Record(Type.String(), Type.Unknown()),
});

type ExecuteRequest = {
  operation: EngineOperationType;
  input: Record<string, unknown>;
  engineToken?: string;
};

export const engineExecutionController: FastifyPluginAsync = async (app) => {
  app.post('/execute', {
    config: {
      security: {
        routeAccessType: RouteAccessType.AUTHENTICATED,
        authorization: {
          authorizationScope: AuthorizationScope.UNSCOPED,
          allowedPrincipals: [PrincipalType.ENGINE, PrincipalType.WORKER],
        },
      },
    },
    schema: {
      body: ExecuteBody,
    },
    handler: async (request, reply) => {
      const {
        operation,
        engineToken = '',
        input,
      } = request.body as ExecuteRequest;

      const result = await dispatchToLocalRunner(operation, engineToken, input);

      return reply.send(result);
    },
  });
};

async function dispatchToLocalRunner(
  operation: EngineOperationType,
  engineToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any,
): Promise<unknown> {
  switch (operation) {
    case EngineOperationType.EXECUTE_FLOW:
      return engineRunner.executeFlow(engineToken, input);
    case EngineOperationType.EXTRACT_BLOCK_METADATA:
      return engineRunner.extractBlockMetadata(input);
    case EngineOperationType.EXECUTE_TRIGGER_HOOK:
      return engineRunner.executeTrigger(engineToken, input);
    case EngineOperationType.EXECUTE_PROPERTY:
      return engineRunner.executeProp(engineToken, input);
    case EngineOperationType.EXECUTE_VALIDATE_AUTH:
      return engineRunner.executeValidateAuth(engineToken, input);
    case EngineOperationType.EXECUTE_STEP:
      return engineRunner.executeAction(engineToken, input);
    case EngineOperationType.RESOLVE_VARIABLE:
      return engineRunner.executeVariable(engineToken, input);
    default:
      throw new Error(`Unknown engine operation: ${operation}`);
  }
}
