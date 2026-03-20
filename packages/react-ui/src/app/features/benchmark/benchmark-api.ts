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

const createBenchmark = (
  provider: string,
  benchmarkConfiguration: Record<string, string[]>,
): Promise<BenchmarkCreationResult> =>
  api.post<
    BenchmarkCreationResult,
    { benchmarkConfiguration: Record<string, string[]> }
  >(`/v1/benchmarks/${provider}`, { benchmarkConfiguration });

const runBenchmark = (
  orchestratorFlowId: string,
  webhookPayload: BenchmarkWebhookPayload,
): Promise<void> =>
  api.post(`/v1/webhooks/${orchestratorFlowId}`, { data: webhookPayload });

const getBenchmarkStatus = (
  benchmarkId: string,
): Promise<BenchmarkStatusResponse> =>
  api.get<BenchmarkStatusResponse>(
    `/v1/benchmarks/${benchmarkId}/status?${Date.now()}`,
  );

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
