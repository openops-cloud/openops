import {
  BenchmarkCreationResult,
  BenchmarkStatusResponse,
  BenchmarkWebhookPayload,
  ListBenchmarksResponse,
  WizardRequest,
  WizardStepResponse,
} from '@openops/shared';

import { api } from '@/app/lib/api';

const getWizardStep = (
  provider: string,
  request: WizardRequest,
): Promise<WizardStepResponse> =>
  api.post<WizardStepResponse, WizardRequest>(
    `/v1/benchmarks/${provider}/wizard`,
    request,
  );

const createBenchmark = (
  provider: string,
  wizardState: Record<string, string[]>,
): Promise<BenchmarkCreationResult> =>
  api.post<BenchmarkCreationResult, { wizardState: Record<string, string[]> }>(
    `/v1/benchmarks/${provider}`,
    { wizardState: wizardState },
  );

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
