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

  logger.info(`Finished operation [${operationType}] in ${duration}ms`, {
    engineStatus: result.status,
    durationMs: duration,
  });

  return key;
}
