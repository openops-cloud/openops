import {
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
  CreateBenchmarkResponse,
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

// TODO: Remove mock and connect to real endpoint once backend is ready
const createBenchmark = (
  provider: string,
  _benchmarkConfiguration: Record<string, string[]>,
): Promise<CreateBenchmarkResponse> =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          benchmarkId: 'mock-benchmark-id',
          folderId: 'mock-folder-id',
          provider,
          workflows: [],
          webhookPayload: {
            webhookBaseUrl: '',
            workflows: [],
            cleanupWorkflows: [],
            accounts: [],
            regions: [],
          },
        }),
      1000,
    ),
  );

export const benchmarkApi = {
  getWizardStep,
  createBenchmark,
};
