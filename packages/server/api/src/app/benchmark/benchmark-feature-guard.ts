import { AppSystemProp, logger, system } from '@openops/server-shared';
import { throwFeatureDisabledError } from './errors';

export async function assertBenchmarkFeatureEnabled(
  provider: string,
  projectId: string,
): Promise<void> {
  if (system.getBoolean(AppSystemProp.FINOPS_BENCHMARK_ENABLED) !== true) {
    logger.info(
      'Benchmark access denied: FINOPS_BENCHMARK_ENABLED flag is not enabled',
      { provider, projectId },
    );
    throwFeatureDisabledError('Benchmark feature is not enabled');
  }
}
