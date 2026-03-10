import { AppSystemProp, logger, system } from '@openops/server-shared';
import { throwFeatureDisabledError } from './errors';

export type BenchmarkFeatureGuard = {
  assertBenchmarkFeatureEnabled(
    projectId: string,
    organizationId: string,
    provider?: string,
  ): Promise<void>;
};

export const benchmarkFeatureGuard: BenchmarkFeatureGuard = {
  async assertBenchmarkFeatureEnabled(
    projectId: string,
    _organizationId: string,
    provider?: string,
  ): Promise<void> {
    if (system.getBoolean(AppSystemProp.FINOPS_BENCHMARK_ENABLED) !== true) {
      logger.info(
        'Benchmark access denied: FINOPS_BENCHMARK_ENABLED flag is not enabled',
        { provider, projectId },
      );
      throwFeatureDisabledError('Benchmark feature is not enabled');
    }
  },
};
