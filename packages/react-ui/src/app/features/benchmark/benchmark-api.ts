import {
  BenchmarkResponse,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
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

export const benchmarkApi = { getBenchmark, getWizardStep };
