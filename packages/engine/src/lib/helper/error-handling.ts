import { SharedSystemProp, system } from '@openops/server-shared';
import { BlockAction, CodeAction, FlowRunStatus } from '@openops/shared';
import { ExecutionMode } from '../core/code/execution-mode';
import { EngineConstants } from '../handler/context/engine-constants';
import {
  ExecutionVerdict,
  FlowExecutorContext,
  VerdictResponse,
} from '../handler/context/flow-execution-context';
import { ExecutionError, ExecutionErrorType } from './execution-errors';

const executionMode = system.get<ExecutionMode>(
  SharedSystemProp.EXECUTION_MODE,
);

export async function runWithExponentialBackoff<
  T extends CodeAction | BlockAction,
>(
  executionState: FlowExecutorContext,
  action: T,
  constants: EngineConstants,
  requestFunction: RequestFunction<T>,
  attemptCount = 1,
): Promise<FlowExecutorContext> {
  const resultExecutionState = await requestFunction({
    action,
    executionState,
    constants,
  });
  const retryEnabled =
    action.settings.errorHandlingOptions?.retryOnFailure?.value;

  if (
    executionFailedWithRetryableError(resultExecutionState) &&
    attemptCount < constants.retryConstants.maxAttempts &&
    retryEnabled &&
    !constants.testSingleStepMode
  ) {
    const backoffTime =
      Math.pow(constants.retryConstants.retryExponential, attemptCount) *
      constants.retryConstants.retryInterval;
    await new Promise((resolve) => setTimeout(resolve, backoffTime));
    return runWithExponentialBackoff(
      executionState,
      action,
      constants,
      requestFunction,
      attemptCount + 1,
    );
  }

  return resultExecutionState;
}

export async function continueIfFailureHandler(
  executionState: FlowExecutorContext,
  action: CodeAction | BlockAction,
  constants: EngineConstants,
): Promise<FlowExecutorContext> {
  const continueOnFailure =
    action.settings.errorHandlingOptions?.continueOnFailure?.value;

  if (
    executionState.verdict === ExecutionVerdict.FAILED &&
    continueOnFailure &&
    !constants.testSingleStepMode
  ) {
    return executionState
      .setVerdict(ExecutionVerdict.RUNNING, undefined)
      .increaseTask();
  }

  return executionState;
}

export const handleExecutionError = (
  error: unknown,
  isCodeBlock = false,
): ErrorHandlingResponse => {
  let message = extractErrorMessage(error);
  if (
    isCodeBlock &&
    executionMode == ExecutionMode.SANDBOX_CODE_ONLY &&
    message
  ) {
    message +=
      '\n\nNote: This code is executing within an "isolated-vm" environment, meaning it ' +
      'has no access to any native Node.js modules, such as "fs", "process", "http", "crypto", etc.';
  }
  const isEngineError =
    error instanceof ExecutionError && error.type === ExecutionErrorType.ENGINE;
  return {
    message,
    verdictResponse: isEngineError
      ? {
          reason: FlowRunStatus.INTERNAL_ERROR,
        }
      : undefined,
  };
};

function extractErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return JSON.stringify(error);
  }

  if (error.message.startsWith('Command failed: npx tsc ')) {
    return error.message
      .replace(/^(?:.|\n)+?stdout:/g, 'Compilation failed.\n')
      .replace(/.+?\/index.ts.*?:/g, '\n');
  }

  return error.message;
}

const executionFailedWithRetryableError = (
  flowExecutorContext: FlowExecutorContext,
): boolean => {
  return flowExecutorContext.verdict === ExecutionVerdict.FAILED;
};

type Request<T extends CodeAction | BlockAction> = {
  action: T;
  executionState: FlowExecutorContext;
  constants: EngineConstants;
};

type RequestFunction<T extends CodeAction | BlockAction> = (
  request: Request<T>,
) => Promise<FlowExecutorContext>;

type ErrorHandlingResponse = {
  message: string;
  verdictResponse: VerdictResponse | undefined;
};
