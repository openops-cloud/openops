import { logger } from '@openops/server-shared';
import { FlagId } from '@openops/shared';
import { flagService } from '../flags/flag.service';
import { throwFeatureDisabledError } from './errors';

export async function assertBenchmarkFeatureEnabled(
  context?: Record<string, unknown>,
): Promise<void> {
  const benchmarkFlag = await flagService.getOne(
    FlagId.FINOPS_BENCHMARK_ENABLED,
  );
  if (benchmarkFlag?.value !== true) {
    logger.info(
      'Benchmark access denied: FINOPS_BENCHMARK_ENABLED flag is not enabled',
      context ?? {},
    );
    throwFeatureDisabledError('Benchmark feature is not enabled');
  }
}
