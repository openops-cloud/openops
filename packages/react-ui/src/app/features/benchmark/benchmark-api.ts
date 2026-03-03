import {
  BenchmarkCreationResult,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
} from '@openops/shared';

import { api } from '@/app/lib/api';

const getWizardStep = (
  provider: string,
  request: BenchmarkWizardRequest,
): Promise<BenchmarkWizardStepResponse> =>
  api.post<BenchmarkWizardStepResponse, BenchmarkWizardRequest>(
    `/v1/benchmarks/${provider}/wizard`,
    request,
  );

const createBenchmark = (
  provider: string,
  benchmarkConfiguration: Record<string, string[]>,
): Promise<BenchmarkCreationResult> =>
  api.post<
    BenchmarkCreationResult,
    { benchmarkConfiguration: Record<string, string[]> }
  >(`/v1/benchmarks/${provider}`, { benchmarkConfiguration });

export const benchmarkApi = {
  getWizardStep,
  createBenchmark,
};
