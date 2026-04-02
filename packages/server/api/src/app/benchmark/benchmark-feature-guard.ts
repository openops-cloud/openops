import { AppSystemProp, logger, system } from '@openops/server-shared';
import { throwFeatureDisabledError } from '@openops/shared';
import { preHandlerAsyncHookHandler } from 'fastify';

export const assertBenchmarkFeatureEnabled: preHandlerAsyncHookHandler = async (
  request,
) => {
  if (system.getBoolean(AppSystemProp.FINOPS_BENCHMARK_ENABLED) !== true) {
    logger.info(
      'Benchmark access denied: FINOPS_BENCHMARK_ENABLED flag is not enabled',
      { projectId: request.principal.projectId },
    );
    throwFeatureDisabledError('Benchmark feature is not enabled');
  }
};
