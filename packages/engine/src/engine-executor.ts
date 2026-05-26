import {
  encryptionKeyInitializer,
  logger,
  networkUtls,
  saveRequestBody,
} from '@openops/server-shared';
import { EngineOperationType } from '@openops/shared';
import { execute } from './lib/operations';

export async function executeEngine(
  requestId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engineInput: any,
  operationType: EngineOperationType,
): Promise<string> {
  const startTime = performance.now();

  encryptionKeyInitializer();

  // TODO: Remove this from the server side
  engineInput.publicUrl = await networkUtls.getPublicUrl();
  engineInput.internalApiUrl = networkUtls.getInternalApiUrl();

  const result = await execute(operationType, engineInput);

  const duration = Math.floor(performance.now() - startTime);

  const key = await saveRequestBody(result);

  logger.info(`Finished engine operation [${operationType}] in ${duration}ms`, {
    runEnvironment: engineInput.runEnvironment ?? undefined,
    operationStatus: hasOperationStatus(result.response)
      ? result.response.status
      : undefined,
    engineStatus: result.status,
    durationMs: duration,
    operationType,
  });

  return key;
}

function hasOperationStatus(
  response: unknown,
): response is { status?: number } {
  return (
    typeof response === 'object' && response !== null && 'status' in response
  );
}
