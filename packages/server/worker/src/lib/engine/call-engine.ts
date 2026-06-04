import { requestContext } from '@fastify/request-context';
import {
  cacheWrapper,
  getContext,
  getEngineTimeout,
  getRequestBody,
  hashUtils,
  logger,
  memoryLock,
  saveRequestBody,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import { EngineOperationType, EngineResponseStatus } from '@openops/shared';
import { nanoid } from 'nanoid';
import {
  acquireEngine,
  disposeEngine,
  EngineOOMError,
  EngineTimeoutError,
} from './engine-pool';
import {
  EngineHelperFlowResult,
  EngineHelperResponse,
  EngineHelperResult,
} from './engine-runner';

const engineMetadataCacheEnabled =
  system.getBoolean(SharedSystemProp.ENGINE_METADATA_CACHE_ENABLED) ?? true;
const cacheEnabledOperations: EngineOperationType[] = engineMetadataCacheEnabled
  ? [EngineOperationType.EXTRACT_BLOCK_METADATA]
  : [];

export async function callEngine<Result extends EngineHelperResult>(
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
  const requestId =
    getContext()['executionCorrelationId'] ??
    requestContext.get('requestId' as never) ??
    nanoid();

  try {
    if (shouldUseCache(operation) && requestKey) {
      engineResult = await cacheWrapper.getSerializedObject<unknown>(
        requestKey,
      );

      if (engineResult) {
        return parseEngineResponse(engineResult);
      }
    }

    logger.debug(`Dispatching engine operation [${operation}]`, {
      requestId,
      operation,
      timeoutSeconds: timeout,
    });

    const inputKey = await saveRequestBody({
      operationType: operation,
      engineInput: input,
      deadlineTimestamp,
      requestId,
    });

    const startTime = performance.now();
    let engine;
    try {
      engine = await acquireEngine();
    } catch (acquireError) {
      // Clean up stored input since no engine will consume it
      await getRequestBody(inputKey).catch(() => undefined);
      throw acquireError;
    }

    let resultKey: string;
    try {
      resultKey = await engine.execute(inputKey, timeout);
    } finally {
      disposeEngine(engine);
    }

    const duration = Math.floor(performance.now() - startTime);
    logger.info(`Engine operation completed [${operation}] in ${duration}ms`, {
      operation,
      requestId,
      durationMs: duration,
    });

    const responseData = await getRequestBody<unknown>(resultKey);

    if (shouldUseCache(operation) && requestKey) {
      await cacheWrapper.setSerializedObject(requestKey, responseData, 600);
    }

    return parseEngineResponse(responseData);
  } catch (error) {
    const errorMessage =
      error instanceof EngineTimeoutError
        ? 'Engine execution timed out.'
        : error instanceof EngineOOMError
        ? 'Engine ran out of memory.'
        : 'An unexpected error occurred while executing engine operation.';

    const status =
      error instanceof EngineTimeoutError
        ? EngineResponseStatus.TIMEOUT
        : EngineResponseStatus.ERROR;

    if (error instanceof EngineTimeoutError) {
      logger.info(errorMessage, { requestId, operation });
    } else {
      logger.error(errorMessage, { error, requestId, operation });
    }

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
  const executionResult = tryParseJson(responseData) as {
    status: string;
    response: unknown;
  };

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
