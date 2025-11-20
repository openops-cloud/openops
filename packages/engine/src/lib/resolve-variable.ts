import {
  ResolveVariableOperation,
  ResolveVariableResponse,
} from '@openops/shared';
import { EngineConstants } from './handler/context/engine-constants';
import { testExecutionContext } from './handler/context/test-execution-context';

export async function resolveVariable(
  input: ResolveVariableOperation,
): Promise<ResolveVariableResponse> {
  try {
    const constants = EngineConstants.fromExecuteStepInput({
      projectId: input.projectId,
      engineToken: input.engineToken,
      internalApiUrl: input.internalApiUrl,
      publicUrl: input.publicUrl,
      flowVersion: input.flowVersion,
      stepName: input.stepName,
      stepTestOutputs: input.stepTestOutputs,
      tablesDatabaseId: input.tablesDatabaseId,
      tablesDatabaseToken: input.tablesDatabaseToken,
    });

    const executionState = await testExecutionContext.stateFromFlowVersion({
      apiUrl: input.internalApiUrl,
      flowVersion: input.flowVersion,
      excludedStepName: input.stepName,
      projectId: input.projectId,
      engineToken: input.engineToken,
      stepTestOutputs: input.stepTestOutputs,
    });

    const { resolvedInput, censoredInput } =
      await constants.propsResolver.resolve({
        unresolvedInput: input.variableExpression,
        executionState,
      });

    return {
      success: true,
      resolvedValue: resolvedInput,
      censoredValue: censoredInput,
    };
  } catch (error) {
    let errorMessage: string;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = String(error);
    }

    return {
      success: false,
      resolvedValue: null,
      censoredValue: null,
      error: errorMessage,
    };
  }
}
