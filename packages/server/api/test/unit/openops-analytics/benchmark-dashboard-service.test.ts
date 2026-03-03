import { BenchmarkProviders } from '@openops/shared';

jest.mock(
  '../../../src/app/openops-analytics/benchmark/create-aws-benchmark-dashboard',
  () => ({
    createAwsBenchmarkDashboard: jest.fn().mockResolvedValue(undefined),
  }),
);

import { createBenchmarkDashboard } from '../../../src/app/openops-analytics/benchmark/benchmark-dashboard-service';
import * as createAwsBenchmarkDashboardModule from '../../../src/app/openops-analytics/benchmark/create-aws-benchmark-dashboard';

const createAwsBenchmarkDashboardMock =
  createAwsBenchmarkDashboardModule.createAwsBenchmarkDashboard as jest.Mock;

const UNSUPPORTED_PROVIDER = 'unsupported_provider';

describe('createBenchmarkDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAwsBenchmarkDashboardMock.mockResolvedValue(undefined);
  });

  it('calls provider creator when provider is supported aws', async () => {
    await createBenchmarkDashboard(BenchmarkProviders.AWS);

    expect(createAwsBenchmarkDashboardMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes provider to lowercase and calls creator', async () => {
    await createBenchmarkDashboard('AWS');

    expect(createAwsBenchmarkDashboardMock).toHaveBeenCalledTimes(1);
  });

  it('throws validation error for unsupported provider', async () => {
    await expect(
      createBenchmarkDashboard(UNSUPPORTED_PROVIDER),
    ).rejects.toThrow(
      `Unsupported benchmark dashboard provider: ${UNSUPPORTED_PROVIDER}`,
    );
    expect(createAwsBenchmarkDashboardMock).not.toHaveBeenCalled();
  });

  it('throws validation error for empty provider', async () => {
    await expect(createBenchmarkDashboard('')).rejects.toThrow(
      'Unsupported benchmark dashboard provider: ',
    );
    expect(createAwsBenchmarkDashboardMock).not.toHaveBeenCalled();
  });
});
