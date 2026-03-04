import {
  BenchmarkProviders,
  openOpsId,
  type BenchmarkConfiguration,
  type BenchmarkWebhookPayload,
  type BenchmarkWorkflowBase,
} from '@openops/shared';
import { webhookUtils } from 'server-worker';
import { transaction } from '../core/db/transaction';
import { benchmarkFlowRepo } from './benchmark-flow.repo';
import type { BenchmarkRow } from './benchmark.entity';
import { benchmarkRepo } from './benchmark.repo';
import { throwValidationError } from './errors';

export type AttachFlowsToBenchmarkRequest = {
  benchmarkConfiguration: BenchmarkConfiguration;
  workflows: BenchmarkWorkflowBase[];
  projectId: string;
  provider: BenchmarkProviders;
  folderId: string | null;
  connectionId: string | null;
};

export type AttachFlowsToBenchmarkResponse = {
  benchmark: BenchmarkRow;
  payload: BenchmarkWebhookPayload;
};

async function buildPayloadForWebhook(params: {
  benchmarkConfiguration: BenchmarkConfiguration;
  workflows: BenchmarkWorkflowBase[];
}): Promise<BenchmarkWebhookPayload> {
  const { benchmarkConfiguration, workflows } = params;

  if (workflows.length < 3) {
    throwValidationError(
      'Benchmark requires orchestrator, cleanup, and at least one sub-workflow',
    );
  }

  const webhookBaseUrl = await webhookUtils.getWebhookPrefix();
  const subWorkflowFlowIds = workflows.slice(2).map((w) => w.flowId);
  const cleanupFlowIds = [workflows[1].flowId];

  return {
    webhookBaseUrl,
    workflows: subWorkflowFlowIds,
    cleanupWorkflows: cleanupFlowIds,
    accounts: benchmarkConfiguration.accounts ?? [],
    regions: benchmarkConfiguration.regions,
  };
}

async function insertBenchmarkRecords(params: {
  projectId: string;
  provider: BenchmarkProviders;
  folderId: string | null;
  connectionId: string | null;
  payload: BenchmarkWebhookPayload;
  workflows: BenchmarkWorkflowBase[];
}): Promise<BenchmarkRow> {
  const { projectId, provider, folderId, connectionId, payload, workflows } =
    params;

  return transaction(async (entityManager) => {
    const benchmarkId = openOpsId();
    const benchmarkRow = {
      id: benchmarkId,
      projectId,
      provider,
      folderId,
      connectionId,
      payload,
      deletedAt: null as string | null,
    };

    const savedBenchmark = await benchmarkRepo(entityManager).save(
      benchmarkRow,
    );

    const benchmarkFlowRows = workflows.map((w) => ({
      id: openOpsId(),
      benchmarkId: savedBenchmark.id,
      flowId: w.flowId,
      isOrchestrator: w.isOrchestrator,
      deletedAt: null as string | null,
    }));

    await benchmarkFlowRepo(entityManager).save(benchmarkFlowRows);

    return savedBenchmark;
  });
}

export async function attachFlowsToBenchmark(
  params: AttachFlowsToBenchmarkRequest,
): Promise<AttachFlowsToBenchmarkResponse> {
  const {
    benchmarkConfiguration,
    workflows,
    projectId,
    provider,
    folderId,
    connectionId,
  } = params;

  const payload = await buildPayloadForWebhook({
    benchmarkConfiguration,
    workflows,
  });

  const benchmark = await insertBenchmarkRecords({
    projectId,
    provider,
    folderId,
    connectionId,
    payload,
    workflows,
  });

  return { benchmark, payload };
}
