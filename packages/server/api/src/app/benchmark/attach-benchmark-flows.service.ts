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
  provider: BenchmarkProviders;
  benchmarkConfiguration: BenchmarkConfiguration;
  workflows: BenchmarkWorkflowBase[];
}): Promise<BenchmarkWebhookPayload> {
  const { provider, benchmarkConfiguration, workflows } = params;

  if (workflows.length < 3) {
    throwValidationError(
      'Benchmark requires orchestrator, cleanup, and at least one sub-workflow',
    );
  }

  const webhookBaseUrl = await webhookUtils.getWebhookPrefix();
  const subWorkflowFlowIds = workflows
    .filter((w) => !w.isOrchestrator && !w.isCleanup)
    .map((w) => w.flowId);
  const cleanupFlowIds = workflows
    .filter((w) => w.isCleanup)
    .map((w) => w.flowId);

  const webhookPayloadCommon = {
    webhookBaseUrl,
    workflows: subWorkflowFlowIds,
    cleanupWorkflows: cleanupFlowIds,
    regions: benchmarkConfiguration.regions ?? [],
  };

  switch (provider) {
    case BenchmarkProviders.AWS:
      return {
        ...webhookPayloadCommon,
        accounts: benchmarkConfiguration.accounts ?? [],
      };
    case BenchmarkProviders.AZURE:
      return {
        ...webhookPayloadCommon,
        subscriptions: benchmarkConfiguration.subscriptions ?? [],
      };
    default: {
      throwValidationError(
        `Unsupported benchmark provider for webhook payload`,
      );
    }
  }
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
      isCleanup: w.isCleanup,
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
    provider,
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
