import { findTestRunLimit, TestRunLimit } from '@openops/shared';
import { EngineConstants } from './handler/context/engine-constants';
import {
  ExecutionVerdict,
  FlowExecutorContext,
  VerdictReason,
  VerdictResponse,
} from './handler/context/flow-execution-context';
import { ExecutionLimitReachedError } from './helper/execution-errors';

export function wasExecutionLimitReached(
  flowExecutionContext: FlowExecutorContext,
): flowExecutionContext is FlowExecutorContext & {
  verdictResponse: Extract<
    VerdictResponse,
    { reason: VerdictReason.EXECUTION_LIMIT_REACHED }
  >;
} {
  const { verdict, verdictResponse } = flowExecutionContext;
  return (
    verdict === ExecutionVerdict.FAILED &&
    verdictResponse?.reason === VerdictReason.EXECUTION_LIMIT_REACHED
  );
}

export function throwIfExecutionLimitReached(
  flowExecutionContext: FlowExecutorContext,
): void {
  if (wasExecutionLimitReached(flowExecutionContext)) {
    throw new ExecutionLimitReachedError(
      flowExecutionContext.verdictResponse.message,
    );
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

const getExecutionLimit = (
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
