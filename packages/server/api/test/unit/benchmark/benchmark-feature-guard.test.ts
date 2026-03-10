jest.mock('@openops/server-shared', () => ({
  system: {
    getBoolean: jest.fn(),
  },
  AppSystemProp: {
    FINOPS_BENCHMARK_ENABLED: 'FINOPS_BENCHMARK_ENABLED',
  },
  logger: {
    info: jest.fn(),
  },
}));

import { logger, system } from '@openops/server-shared';

const mockSystem = system as jest.Mocked<typeof system>;

import { benchmarkFeatureGuard } from '../../../src/app/benchmark/benchmark-feature-guard';

describe('benchmarkFeatureGuard', () => {
  const projectId = 'project-id';
  const organizationId = 'org-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if FINOPS_BENCHMARK_ENABLED is not enabled', async () => {
    mockSystem.getBoolean.mockReturnValue(false);

    await expect(
      benchmarkFeatureGuard.assertBenchmarkFeatureEnabled(
        projectId,
        organizationId,
      ),
    ).rejects.toThrow(
      expect.objectContaining({
        message: 'FEATURE_DISABLED: Benchmark feature is not enabled',
      }),
    );

    expect(logger.info).toHaveBeenCalledWith(
      'Benchmark access denied: FINOPS_BENCHMARK_ENABLED flag is not enabled',
      { provider: undefined, projectId },
    );
  });

  it('should pass when FINOPS_BENCHMARK_ENABLED is true', async () => {
    mockSystem.getBoolean.mockReturnValue(true);

    await expect(
      benchmarkFeatureGuard.assertBenchmarkFeatureEnabled(
        projectId,
        organizationId,
      ),
    ).resolves.toBeUndefined();
  });
});
