import {
  BenchmarkCreationResult,
  BenchmarkStatusResponse,
  BenchmarkWebhookPayload,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
  ListBenchmarksResponse,
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
): Promise<BenchmarkCreationResult> =>
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
            workflows: ['Run AWS Benchmark'],
            cleanupWorkflows: [],
            accounts: [],
            regions: [],
          },
        }),
      1000,
    ),
  );

const runBenchmark = (
  orchestratorFlowId: string,
  webhookPayload: BenchmarkWebhookPayload,
): Promise<void> =>
  api.post(`/v1/webhooks/${orchestratorFlowId}`, { data: webhookPayload });

const getBenchmarkStatus = (
  benchmarkId: string,
): Promise<BenchmarkStatusResponse> =>
  api.get<BenchmarkStatusResponse>(`/v1/benchmarks/${benchmarkId}/status`);

const listBenchmarks = (provider?: string): Promise<ListBenchmarksResponse> =>
  api.get<ListBenchmarksResponse>(
    '/v1/benchmarks',
    provider ? { provider } : undefined,
  );

export const benchmarkApi = {
  getWizardStep,
  createBenchmark,
  runBenchmark,
  getBenchmarkStatus,
  listBenchmarks,
};
