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
