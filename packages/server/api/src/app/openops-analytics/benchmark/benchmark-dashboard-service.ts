import { BenchmarkProviders } from '@openops/shared';
import { throwValidationError } from '../../benchmark/errors';
import { createAwsBenchmarkDashboard } from './create-aws-benchmark-dashboard';
import { createAzureBenchmarkDashboard } from './create-azure-benchmark-dashboard';

export async function createBenchmarkDashboard(
  provider: string,
): Promise<void> {
  switch (provider) {
    case BenchmarkProviders.AWS:
      await createAwsBenchmarkDashboard();
      break;
    case BenchmarkProviders.AZURE:
      await createAzureBenchmarkDashboard();
      break;
    default:
      throwValidationError(
        `Unsupported benchmark dashboard provider: ${provider}`,
      );
  }
}
