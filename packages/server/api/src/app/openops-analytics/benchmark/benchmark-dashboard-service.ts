import { BenchmarkProviders } from '@openops/shared';
import { throwValidationError } from '../../benchmark/errors';
import { createAwsBenchmarkDashboard } from './create-aws-benchmark-dashboard';

export async function createBenchmarkDashboard(
  provider: string,
): Promise<void> {
  switch (provider) {
    case BenchmarkProviders.AWS:
      await createAwsBenchmarkDashboard();
      break;
    default:
      throwValidationError(
        `Unsupported benchmark dashboard provider: ${provider}`,
      );
  }
}
