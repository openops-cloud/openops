import { logger } from '@openops/server-shared';
import {
  SplitAction,
  SplitActionSettings,
  SplitStepOutput,
  StepOutputStatus,
} from '@openops/shared';
import { BaseExecutor } from './base-executor';
import { evaluateConditions } from './branch-executor';
import { EngineConstants } from './context/engine-constants';
import {
  ExecutionVerdict,
  FlowExecutorContext,
} from './context/flow-execution-context';
import { flowExecutor } from './flow-executor';

export const splitExecutor: BaseExecutor<SplitAction> = {
  async handle({
    action,
    executionState,
    constants,
  }: {
    action: SplitAction;
    executionState: FlowExecutorContext;
    constants: EngineConstants;
  }) {
    const { censoredInput, resolvedInput } =
      await constants.propsResolver.resolve<SplitActionSettings>({
        unresolvedInput: action.settings,
        executionState,
      });

    const evaluatedOptions = resolvedInput.options
      .filter((x) => x.id !== action.settings.defaultBranch)
      .map((option) => ({
        optionName: option.name,
        optionId: option.id,
        conditionsMatched: evaluateConditions(option.conditions),
      }));

    const optionsThatMatch = evaluatedOptions.filter(
      (option) => option.conditionsMatched,
    );

    const defaultOption = resolvedInput.options.find(
      (x) => x.id === action.settings.defaultBranch,
    );

    const stepOutput = SplitStepOutput.init({ input: censoredInput }).setOutput(
      {
        evaluatedOptions,
        selectedOptionName:
          optionsThatMatch?.[0]?.optionName ?? defaultOption?.name,
      },
    );

    if (optionsThatMatch.length > 1) {
      const errorMessage = `Multiple branch conditions are matched (${optionsThatMatch
        .map((x) => x.optionName)
        .join(', ')}). Flow execution is stopped!`;
      logger.debug(errorMessage);
      const failedStepOutput = stepOutput
        .setStatus(StepOutputStatus.FAILED)
        .setErrorMessage(errorMessage);
      return executionState
        .upsertStep(action.name, failedStepOutput)
        .setVerdict(ExecutionVerdict.FAILED, undefined);
    }

    const selectedOptionId =
      optionsThatMatch.length === 0
        ? action.settings.defaultBranch
        : optionsThatMatch[0].optionId;
    const branchToExecute = action.branches.find(
      (branch) => branch.optionId === selectedOptionId,
    );

    if (!branchToExecute) {
      logger.error(
        `Did not find a branch that matches optionId ${selectedOptionId}, branches: ${JSON.stringify(
          action.branches,
        )}`,
      );
      const failedStepOutput = stepOutput
        .setStatus(StepOutputStatus.FAILED)
        .setErrorMessage(
          `Did not find a branch that matches optionId=${selectedOptionId}. Flow execution is stopped!`,
        );
      return executionState
        .upsertStep(action.name, failedStepOutput)
        .setVerdict(ExecutionVerdict.FAILED, undefined);
    }

    const executionContext = executionState.upsertStep(action.name, stepOutput);
    const nextAction = branchToExecute.nextAction ?? action.nextAction;

    if (!nextAction) {
      return executionContext;
    }

    try {
      return await flowExecutor.executeFromAction({
        action: nextAction,
        executionState: executionContext,
        constants,
      });
    } catch (e) {
      logger.error(e);
      const failedStepOutput = stepOutput
        .setErrorMessage((e as Error).message)
        .setStatus(StepOutputStatus.FAILED);
      return executionState
        .upsertStep(action.name, failedStepOutput)
        .setVerdict(ExecutionVerdict.FAILED, undefined);
    }
  },
};
