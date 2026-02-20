import {
  BenchmarkResponse,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
  CreateBenchmarkRequest,
  CreateBenchmarkResponse,
} from '@openops/shared';

import { api } from '@/app/lib/api';

const getBenchmark = (provider: string): Promise<BenchmarkResponse> =>
  api.get<BenchmarkResponse>(`/v1/benchmarks/${provider}`);

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
): Promise<CreateBenchmarkResponse> =>
  api.post<CreateBenchmarkResponse, CreateBenchmarkRequest>(
    `/v1/benchmarks/${provider}`,
    { benchmarkConfiguration },
  );

export const benchmarkApi = { getBenchmark, getWizardStep, createBenchmark };
