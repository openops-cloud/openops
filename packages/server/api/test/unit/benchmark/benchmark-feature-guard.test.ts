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
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const mockSystem = system as jest.Mocked<typeof system>;

import { assertBenchmarkFeatureEnabled } from '../../../src/app/benchmark/benchmark-feature-guard';

const mockFastifyInstance = {} as FastifyInstance;

const mockRequest = (projectId: string) =>
  ({ principal: { projectId } } as unknown as FastifyRequest);

const mockReply = {} as FastifyReply;

const callHook = (projectId: string) =>
  assertBenchmarkFeatureEnabled.call(
    mockFastifyInstance,
    mockRequest(projectId),
    mockReply,
  );

describe('assertBenchmarkFeatureEnabled', () => {
  const projectId = 'project-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if FINOPS_BENCHMARK_ENABLED is not enabled', async () => {
    mockSystem.getBoolean.mockReturnValue(false);

    await expect(callHook(projectId)).rejects.toThrow(
      expect.objectContaining({
        message: 'FEATURE_DISABLED: Benchmark feature is not enabled',
      }),
    );

    expect(logger.info).toHaveBeenCalledWith(
      'Benchmark access denied: FINOPS_BENCHMARK_ENABLED flag is not enabled',
      { projectId },
    );
  });

  it('should pass when FINOPS_BENCHMARK_ENABLED is true', async () => {
    mockSystem.getBoolean.mockReturnValue(true);

    await expect(callHook(projectId)).resolves.toBeUndefined();
  });
});
