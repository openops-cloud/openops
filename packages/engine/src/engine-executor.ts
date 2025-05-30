import {
  encryptionKeyInitializer,
  logger,
  networkUtls,
} from '@openops/server-shared';
import { EngineOperationType, EngineResponse } from '@openops/shared';
import { execute } from './lib/operations';

export async function executeEngine(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engineInput: any,
  operationType: EngineOperationType,
): Promise<EngineResponse<unknown>> {
  const startTime = performance.now();

  await encryptionKeyInitializer();

  // TODO: Remove this from the server side
  engineInput.publicUrl = await networkUtls.getPublicUrl();
  engineInput.internalApiUrl = networkUtls.getInternalApiUrl();

  const result = await execute(operationType, engineInput);

  const duration = Math.floor(performance.now() - startTime);

  logger.info(
    `Finished operation [${operationType}] with status [${result.status}] in ${duration}ms`,
    {
      engineStatus: result.status,
      durationMs: duration,
    },
  );

  return result;
}
