import { SharedSystemProp, system } from '@openops/server-shared';
import type { StepRetryMetadata } from '@openops/shared';
import { ActionType, BlockAction, CodeAction, isObject } from '@openops/shared';
import { ExecutionMode } from '../core/code/execution-mode';
import { wasExecutionLimitReached } from '../execution-limit-reached';
import { EngineConstants } from '../handler/context/engine-constants';
import {
  ExecutionVerdict,
  FlowExecutorContext,
  VerdictReason,
  VerdictResponse,
} from '../handler/context/flow-execution-context';
import {
  ExecutionError,
  ExecutionErrorType,
  ExecutionLimitReachedError,
} from './execution-errors';

const executionMode = system.get<ExecutionMode>(
  SharedSystemProp.EXECUTION_MODE,
);
const DEFAULT_AZURE_429_RETRY_DELAY_MS = 60000;
const MAX_AZURE_429_RETRY_DELAY_MS = 10 * 60 * 1000;
const AZURE_BLOCK_NAME = '@openops/block-azure';
const CUSTOM_AZURE_API_ACTION_NAME = 'custom_azure_api_call';
const AZURE_429_RETRY_TYPE = 'AZURE_429';

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
    const backoffTime = getRetryDelayMs(
      resultExecutionState,
      action,
      constants,
      attemptCount,
    );
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

  if (wasExecutionLimitReached(executionState)) {
    return executionState;
  }

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

  if (error instanceof ExecutionLimitReachedError) {
    return {
      message,
      verdictResponse: {
        reason: VerdictReason.EXECUTION_LIMIT_REACHED,
        message: error.getMessage(),
      },
    };
  }
  const isEngineError =
    error instanceof ExecutionError && error.type === ExecutionErrorType.ENGINE;
  return {
    message,
    verdictResponse: isEngineError
      ? {
          reason: VerdictReason.INTERNAL_ERROR,
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

export function getBlockRetryMetadata(
  action: BlockAction,
  error: unknown,
): StepRetryMetadata | undefined {
  if (!isAzureCustomApiAction(action) || !isHttpErrorLike(error)) {
    return undefined;
  }

  if (error.response.status !== 429) {
    return undefined;
  }

  return {
    type: AZURE_429_RETRY_TYPE,
    retryAfterMs: sanitizeRetryAfterMs(error.retryAfterMs),
  };
}

function getRetryDelayMs<T extends CodeAction | BlockAction>(
  executionState: FlowExecutorContext,
  action: T,
  constants: EngineConstants,
  attemptCount: number,
): number {
  const retryMetadata = getRetryMetadata(executionState, action);
  if (retryMetadata?.type === AZURE_429_RETRY_TYPE) {
    return (
      sanitizeRetryAfterMs(retryMetadata.retryAfterMs) ??
      DEFAULT_AZURE_429_RETRY_DELAY_MS
    );
  }

  return (
    Math.pow(constants.retryConstants.retryExponential, attemptCount) *
    constants.retryConstants.retryInterval
  );
}

function getRetryMetadata<T extends CodeAction | BlockAction>(
  executionState: FlowExecutorContext,
  action: T,
): StepRetryMetadata | undefined {
  if (action.type !== ActionType.BLOCK) {
    return undefined;
  }

  return executionState.getStepOutput(action.name)?.retryMetadata;
}

function isAzureCustomApiAction(action: BlockAction): boolean {
  return (
    action.settings.blockName === AZURE_BLOCK_NAME &&
    action.settings.actionName === CUSTOM_AZURE_API_ACTION_NAME
  );
}

function isHttpErrorLike(error: unknown): error is HttpErrorLike {
  if (!isObject(error) || !('response' in error)) {
    return false;
  }

  const response = error.response;
  return isObject(response) && typeof response.status === 'number';
}

function sanitizeRetryAfterMs(retryAfterMs: unknown): number | undefined {
  if (typeof retryAfterMs !== 'number' || !Number.isFinite(retryAfterMs)) {
    return undefined;
  }

  if (retryAfterMs <= 0) {
    return undefined;
  }

  return Math.min(retryAfterMs, MAX_AZURE_429_RETRY_DELAY_MS);
}

type Request<T extends CodeAction | BlockAction> = {
  action: T;
  executionState: FlowExecutorContext;
  constants: EngineConstants;
};

type RequestFunction<T extends CodeAction | BlockAction> = (
  request: Request<T>,
) => Promise<FlowExecutorContext>;

type HttpErrorLike = {
  response: {
    status: number;
  };
  retryAfterMs?: number;
};

type ErrorHandlingResponse = {
  message: string;
  verdictResponse: VerdictResponse | undefined;
};
