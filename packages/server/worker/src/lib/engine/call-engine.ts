import { requestContext } from '@fastify/request-context';
import {
  AppSystemProp,
  cacheWrapper,
  getContext,
  getEngineTimeout,
  hashUtils,
  logger,
  memoryLock,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import {
  EngineOperationType,
  EngineResponse,
  EngineResponseStatus,
} from '@openops/shared';
import axios, { AxiosError } from 'axios';
import { nanoid } from 'nanoid';
import {
  EngineHelperFlowResult,
  EngineHelperResponse,
  EngineHelperResult,
} from './engine-runner';

const ENGINE_URL = system.getOrThrow(AppSystemProp.ENGINE_URL);

const cacheEnabledOperations: EngineOperationType[] =
  system.getOrThrow(SharedSystemProp.ENVIRONMENT) === 'dev'
    ? []
    : [EngineOperationType.EXTRACT_BLOCK_METADATA];

export async function callEngineLambda<Result extends EngineHelperResult>(
  operation: EngineOperationType,
  input: unknown,
): Promise<EngineHelperResponse<Result>> {
  const timeout = getEngineTimeout(operation);

  const requestInput = {
    operationType: operation,
    engineInput: input,
  };

  let lock = undefined;
  let requestKey = undefined;
  let engineResult = undefined;
  if (shouldUseCache(operation)) {
    requestKey = hashUtils.hashObject(requestInput, replaceVolatileValues);

    engineResult = await cacheWrapper.getSerializedObject<unknown>(requestKey);
    if (engineResult) {
      return parseEngineResponse(engineResult);
    }

    lock = await memoryLock.acquire(`engine-${requestKey}`);
  }

  const deadlineTimestamp = Date.now() + timeout * 1000;
  try {
    if (shouldUseCache(operation) && requestKey) {
      engineResult = await cacheWrapper.getSerializedObject<unknown>(
        requestKey,
      );

      if (engineResult) {
        return parseEngineResponse(engineResult);
      }
    }

    const requestId =
      getContext()['executionCorrelationId'] ??
      requestContext.get('requestId' as never) ??
      nanoid();

    logger.debug(`Requesting the engine to run [${operation}]`, {
      operation,
      timeoutSeconds: timeout,
    });

    const requestResponse = await axios.post(
      `${ENGINE_URL}`,
      {
        ...requestInput,
        deadlineTimestamp,
      },
      {
        headers: {
          requestId,
        },
        timeout: timeout * 1000,
      },
    );

    const responseData = requestResponse.data.body || requestResponse.data;

    logger.debug('Engine response received.', { response: responseData });

    if (shouldUseCache(operation) && requestKey) {
      await cacheWrapper.setSerializedObject(requestKey, responseData, 600);
    }

    return parseEngineResponse(responseData);
  } catch (error) {
    const { status, errorMessage } = logEngineError(deadlineTimestamp, error);

    return {
      status,
      result: {
        success: false,
        message: errorMessage,
      } as Result,
    };
  } finally {
    await lock?.release();
  }
}

function parseEngineResponse<Result extends EngineHelperResult>(
  responseData: unknown,
): { status: EngineResponseStatus; result: Result } {
  const executionResult = tryParseJson(responseData) as EngineResponse<unknown>;

  const output = tryParseJson(
    executionResult.response,
  ) as EngineHelperFlowResult;

  return {
    status: EngineResponseStatus.OK,
    result: output as Result,
  };
}

function tryParseJson(value: unknown): unknown {
  try {
    return JSON.parse(value as string);
  } catch (e) {
    return value;
  }
}

function shouldUseCache(operationType: EngineOperationType): boolean {
  return cacheEnabledOperations.includes(operationType);
}

function replaceVolatileValues(key: string, value: unknown): unknown {
  if (key === 'engineToken' || key === 'updated') {
    return undefined;
  }

  return value;
}

function logEngineError(
  deadlineTimestamp: number,
  error: unknown,
): { status: EngineResponseStatus; errorMessage: string } {
  const errorTimestamp = Date.now();
  let status = EngineResponseStatus.ERROR;
  let errorMessage =
    'An unexpected error occurred while making a request to the engine.';
  if (
    errorTimestamp > deadlineTimestamp ||
    (axios.isAxiosError(error) &&
      (error as AxiosError).response?.status === 504)
  ) {
    status = EngineResponseStatus.TIMEOUT;
    errorMessage = 'Engine execution timed out.';

    logger.debug(errorMessage, {
      error,
      errorTimestamp,
      deadlineTimestamp,
    });
  } else {
    logger.error(errorMessage, { error, errorTimestamp, deadlineTimestamp });
  }

  return {
    status,
    errorMessage,
  };
}
