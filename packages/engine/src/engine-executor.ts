import {
  encryptionKeyInitializer,
  logger,
  networkUtls,
} from '@openops/server-shared';
import {
  EngineOperationType,
  EngineResponse,
  EngineResponseStatus,
  ResolveVariableOperation,
} from '@openops/shared';
import { execute } from './lib/operations';
import { resolveVariable } from './lib/resolve-variable';

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

  let result: EngineResponse<unknown>;

  // todo:
  if ((operationType as string) === 'RESOLVE_VARIABLE') {
    try {
      const output = await resolveVariable(
        engineInput as ResolveVariableOperation,
      );
      result = {
        status: EngineResponseStatus.OK,
        response: output,
      };
    } catch (error) {
      result = {
        status: EngineResponseStatus.ERROR,
        response: (error as Error).message,
      };
    }
  } else {
    result = await execute(operationType, engineInput);
  }

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
