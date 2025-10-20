import { findTestRunLimit, TestRunLimit } from '@openops/shared';
import { EngineConstants } from './handler/context/engine-constants';
import {
  ExecutionVerdict,
  FlowExecutorContext,
  VerdictReason,
} from './handler/context/flow-execution-context';
import { ExecutionLimitReachedError } from './helper/execution-errors';

export function throwIfExecutionLimitReached(
  flowExecutionContext: FlowExecutorContext,
): void {
  const { verdict, verdictResponse } = flowExecutionContext;

  if (
    verdict === ExecutionVerdict.FAILED &&
    verdictResponse?.reason === VerdictReason.EXECUTION_LIMIT_REACHED
  ) {
    throw new ExecutionLimitReachedError(verdictResponse.message);
  }
}

export const incrementActionCountIfNeeded = (
  blockName: string,
  actionName: string,
  executionState: FlowExecutorContext,
  constants: EngineConstants,
): FlowExecutorContext => {
  const limit = getExecutionLimit(blockName, actionName, constants);

  if (limit) {
    return executionState.incrementActionExecutionCount(blockName, actionName);
  }

  return executionState;
};

export const throwIfExceededExecutionLimit = (
  blockName: string,
  actionName: string,
  executionState: FlowExecutorContext,
  constants: EngineConstants,
): void => {
  const limit = getExecutionLimit(blockName, actionName, constants);

  if (limit) {
    const currentCount = executionState.getActionExecutionCount(
      blockName,
      actionName,
    );

    if (currentCount >= limit.limit) {
      throw new ExecutionLimitReachedError(limit.limit);
    }
  }
};

export const getExecutionLimit = (
  blockName: string,
  actionName: string,
  constants: EngineConstants,
): TestRunLimit | undefined => {
  if (!constants.isTestRun || !constants.testRunActionLimits.isEnabled) {
    return undefined;
  }

  const limit = findTestRunLimit(
    constants.testRunActionLimits.limits,
    blockName,
    actionName,
  );

  return limit?.isEnabled ? limit : undefined;
};
