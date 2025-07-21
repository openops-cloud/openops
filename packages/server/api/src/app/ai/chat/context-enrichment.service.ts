import { logger, safeStringifyAndTruncate } from '@openops/server-shared';
import {
  ChatFlowContext,
  encodeStepOutputs,
  flowHelper,
  OpenOpsId,
  PopulatedFlow,
  StepContext,
  VariableContext,
} from '@openops/shared';
import { engineRunner } from 'server-worker';
import { accessTokenManager } from '../../../app/authentication/lib/access-token-manager';
import { flowService } from '../../../app/flows/flow/flow.service';
import { flowStepTestOutputService } from '../../../app/flows/step-test-output/flow-step-test-output.service';

type FlowData = {
  flow: PopulatedFlow;
  engineToken: string;
  stepTestOutputs: Record<OpenOpsId, string>;
};

export enum IncludeOptions {
  ALWAYS = 'always',
  NEVER = 'never',
  ONLY_IF_ERROR = 'only-if-error',
}

type Options = {
  includeCurrentStepOutput: IncludeOptions;
};

export async function enrichContext(
  additionalContext: ChatFlowContext,
  projectId: string,
  options?: Options,
): Promise<ChatFlowContext> {
  try {
    if (!additionalContext.steps) {
      return {
        flowId: additionalContext.flowId,
        flowVersionId: additionalContext.flowVersionId,
        steps: [],
      };
    }

    const flowData = await getFlowData(additionalContext, projectId);
    const enrichedSteps = await enrichSteps(
      additionalContext.steps,
      flowData,
      projectId,
    );

    const currentStepData = await getCurrentStepData(
      additionalContext,
      options,
    );

    return {
      flowId: additionalContext.flowId,
      flowVersionId: additionalContext.flowVersionId,
      steps: enrichedSteps,
      currentStepId: additionalContext.currentStepId,
      currentStepData,
    };
  } catch (error) {
    logger.error('Failed to enrich context', { error });
    throw error;
  }
}

async function getCurrentStepData(
  additionalContext: ChatFlowContext,
  options?: Options,
): Promise<string> {
  if (additionalContext.currentStepId) {
    const stepOutput = await flowStepTestOutputService.listDecrypted({
      flowVersionId: additionalContext.flowVersionId,
      stepIds: [additionalContext.currentStepId],
    });

    const currentStepOutput = stepOutput?.[0];

    if (!currentStepOutput) {
      return '';
    }

    const currentStepData = safeStringifyAndTruncate(currentStepOutput.output);

    switch (options?.includeCurrentStepOutput) {
      case IncludeOptions.ALWAYS:
        return currentStepData;
      case IncludeOptions.NEVER:
        return '';
      case IncludeOptions.ONLY_IF_ERROR:
        return currentStepOutput.success ? '' : currentStepData;
      default:
        return '';
    }
  }
  return '';
}

async function getFlowData(
  additionalContext: ChatFlowContext,
  projectId: string,
): Promise<FlowData> {
  const [flow, engineToken] = await Promise.all([
    getFlow(additionalContext, projectId),
    getEngineToken(projectId),
  ]);

  const stepTestOutputs = await getStepTestOutputs(
    additionalContext.flowVersionId,
    flow,
  );

  return {
    flow,
    engineToken,
    stepTestOutputs,
  };
}

async function getFlow(
  additionalContext: ChatFlowContext,
  projectId: string,
): Promise<PopulatedFlow> {
  try {
    return await flowService.getOnePopulatedOrThrow({
      projectId,
      id: additionalContext.flowId,
      versionId: additionalContext.flowVersionId,
    });
  } catch (error) {
    logger.error('Failed to fetch flow', { error });
    throw error;
  }
}

async function getEngineToken(projectId: string): Promise<string> {
  try {
    return await accessTokenManager.generateEngineToken({
      projectId,
    });
  } catch (error) {
    logger.error('Failed to generate engine token', { error });
    throw error;
  }
}

async function getStepTestOutputs(
  flowVersionId: string,
  flow: PopulatedFlow,
): Promise<Record<OpenOpsId, string>> {
  try {
    const stepIds = flowHelper.getAllStepIds(flow.version.trigger);
    const outputs = await flowStepTestOutputService.listEncrypted({
      flowVersionId,
      stepIds,
    });

    return encodeStepOutputs(outputs);
  } catch (error) {
    logger.error('Failed to get step test outputs', { error });
    throw error;
  }
}

async function enrichSteps(
  steps: StepContext[],
  flowData: FlowData,
  projectId: string,
): Promise<StepContext[]> {
  const enrichedSteps = await Promise.all(
    steps.map(async (step) => {
      try {
        return await enrichStep(step, flowData, projectId);
      } catch (error) {
        return {
          id: step.id,
          stepName: step.stepName,
          variables: step.variables?.map((variable) => ({
            name: variable.name,
            value: String(error),
          })),
        };
      }
    }),
  );

  return enrichedSteps;
}

async function enrichStep(
  step: StepContext,
  flowData: FlowData,
  projectId: string,
): Promise<StepContext> {
  if (!step.variables || step.variables.length === 0) {
    return {
      id: step.id,
      stepName: step.stepName,
      variables: step.variables,
    };
  }

  const resolvedVariables = await resolveStepVariables(
    step,
    flowData,
    projectId,
  );

  return {
    id: step.id,
    stepName: step.stepName,
    variables: resolvedVariables,
  };
}

async function resolveStepVariables(
  step: StepContext,
  flowData: FlowData,
  projectId: string,
): Promise<VariableContext[]> {
  if (!step.variables) {
    return [];
  }

  const resolvedVariables = await Promise.all(
    step.variables.map(async (variable) => {
      try {
        return await resolveVariable(variable, step, flowData, projectId);
      } catch (error) {
        return {
          name: variable.name,
          value: `Error resolving variable: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
    }),
  );

  return resolvedVariables;
}

async function resolveVariable(
  variable: { name: string; value: string },
  step: StepContext,
  flowData: FlowData,
  projectId: string,
): Promise<{ name: string; value: unknown }> {
  const { result } = await engineRunner.executeVariable(flowData.engineToken, {
    variableExpression: variable.value,
    flowVersion: flowData.flow.version,
    projectId,
    stepName: step.stepName,
    stepTestOutputs: flowData.stepTestOutputs,
  });

  return {
    name: variable.name,
    value: result.success
      ? safeStringifyAndTruncate(result.censoredValue)
      : String(result.error),
  };
}
