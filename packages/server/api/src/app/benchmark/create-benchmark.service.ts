import {
  ApplicationError,
  BenchmarkProviders,
  ContentType,
  ErrorCode,
  Folder,
  openOpsId,
  type BenchmarkConfiguration,
  type BenchmarkCreationResult,
  type BenchmarkWebhookPayload,
  type BenchmarkWorkflowBase,
} from '@openops/shared';
import fs from 'node:fs/promises';
import { webhookUtils } from 'server-worker';
import { IsNull } from 'typeorm';
import { transaction } from '../core/db/transaction';
import { flowService } from '../flows/flow/flow.service';
import { flowFolderService } from '../flows/folder/folder.service';
import {
  bulkCreateAndPublishFlows,
  type WorkflowTemplate,
} from './benchmark-flow-bulk-create';
import { benchmarkFlowRepo } from './benchmark-flow.repo';
import type { BenchmarkRow } from './benchmark.entity';
import { benchmarkRepo } from './benchmark.repo';
import { resolveWorkflowPathsForSeed } from './catalog-resolver';
import { getConnectionsWithBlockSupport } from './connections-with-supported-blocks';
import { throwValidationError } from './errors';

function validateBenchmarkConfiguration(config: BenchmarkConfiguration): void {
  const connection = config.connection ?? [];
  const workflows = config.workflows ?? [];
  if (connection.length === 0) {
    throwValidationError(
      'You must select at least one connection to create a benchmark',
    );
  }
  if (workflows.length === 0) {
    throwValidationError(
      'You must select at least one workflow to create a benchmark',
    );
  }
}

async function deleteFlowsByIds(params: {
  flowIds: string[];
  projectId: string;
  userId: string;
}): Promise<void> {
  const { flowIds, projectId, userId } = params;
  for (const flowId of flowIds) {
    try {
      await flowService.delete({ id: flowId, projectId, userId });
    } catch (err) {
      if (
        err instanceof ApplicationError &&
        err.error?.code === ErrorCode.ENTITY_NOT_FOUND
      ) {
        continue;
      }
      throw err;
    }
  }
}

function getBenchmarkFolderDisplayName(provider: string): string {
  const normalizedProvider = provider.toLowerCase();
  switch (normalizedProvider) {
    case BenchmarkProviders.AWS:
      return 'AWS Benchmark';
    default:
      throwValidationError(`Unknown provider: ${provider}`);
  }
}

async function ensureBenchmarkFolder(
  projectId: string,
  displayName: string,
): Promise<Folder> {
  return flowFolderService.getOrCreate({
    projectId,
    request: {
      displayName,
      contentType: ContentType.WORKFLOW,
    },
  });
}

export async function deleteFlowsForExistingBenchmark(params: {
  projectId: string;
  provider: string;
  folderId: string;
  userId: string;
}): Promise<void> {
  const { projectId, provider, folderId, userId } = params;

  const rows = await benchmarkFlowRepo()
    .createQueryBuilder('bf')
    .innerJoin('benchmark', 'b', 'b.id = bf.benchmarkId')
    .select(['b.id AS "benchmarkId"', 'bf.flowId AS "flowId"'])
    .where('b.projectId = :projectId', { projectId })
    .andWhere('b.provider = :provider', { provider })
    .andWhere('b.folderId = :folderId', { folderId })
    .andWhere('b.deletedAt IS NULL')
    .andWhere('bf.deletedAt IS NULL')
    .getRawMany<{ benchmarkId: string; flowId: string }>();

  if (rows.length === 0) {
    return;
  }

  const benchmarkId = rows[0].benchmarkId;
  const flowIds = rows.map((r) => r.flowId);
  const now = new Date().toISOString();

  await deleteFlowsByIds({
    flowIds,
    projectId,
    userId,
  });

  await benchmarkFlowRepo().update(
    { benchmarkId, deletedAt: IsNull() },
    { deletedAt: now },
  );

  await benchmarkRepo().update(
    { id: benchmarkId, deletedAt: IsNull() },
    { deletedAt: now },
  );
}

async function loadWorkflowTemplates(
  provider: string,
  workflowIds: string[],
): Promise<WorkflowTemplate[]> {
  const paths = resolveWorkflowPathsForSeed(provider, workflowIds);

  if (paths.length === 0) {
    return [];
  }

  const parsedTemplates = paths.map(async ({ filePath }) => {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content) as {
      template: WorkflowTemplate['template'];
    };
    return { template: parsed.template };
  });

  return Promise.all(parsedTemplates);
}

export async function createBenchmarkWorkflows(params: {
  provider: string;
  workflowIds: string[];
  connectionId: string;
  projectId: string;
  folderId: string;
}): Promise<BenchmarkWorkflowBase[]> {
  const { provider, workflowIds, connectionId, projectId, folderId } = params;

  if (workflowIds.length === 0) {
    return [];
  }

  const templates = await loadWorkflowTemplates(provider, workflowIds);

  const connections = await getConnectionsWithBlockSupport(projectId, [
    connectionId,
  ]);
  const results = await bulkCreateAndPublishFlows(
    templates,
    connections,
    projectId,
    folderId,
  );

  return results.map((r, index) => ({
    flowId: r.id,
    displayName: r.version.displayName,
    isOrchestrator: index === 0,
  }));
}

export function buildBenchmarkPayload(params: {
  benchmarkConfiguration: BenchmarkConfiguration;
  workflows: BenchmarkWorkflowBase[];
  webhookBaseUrl: string;
}): BenchmarkWebhookPayload {
  const { benchmarkConfiguration, workflows, webhookBaseUrl } = params;

  if (workflows.length < 3) {
    throwValidationError(
      'Benchmark requires orchestrator, cleanup, and at least one sub-workflow',
    );
  }

  const subWorkflowFlowIds = workflows.slice(2).map((w) => w.flowId);
  const cleanupFlowIds = [workflows[1].flowId];

  return {
    webhookBaseUrl,
    workflows: subWorkflowFlowIds,
    cleanupWorkflows: cleanupFlowIds,
    accounts: benchmarkConfiguration.accounts ?? [],
    regions: benchmarkConfiguration.regions ?? [],
  };
}

export async function insertBenchmarkRecords(params: {
  projectId: string;
  provider: string;
  folderId: string;
  connectionId: string;
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
      lastRunId: null as string | null,
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

export async function createBenchmark(params: {
  provider: string;
  projectId: string;
  userId: string;
  benchmarkConfiguration: BenchmarkConfiguration;
}): Promise<BenchmarkCreationResult> {
  const { provider, projectId, userId, benchmarkConfiguration } = params;

  validateBenchmarkConfiguration(benchmarkConfiguration);

  const webhookBaseUrl = await webhookUtils.getWebhookPrefix();

  const workflowIds = benchmarkConfiguration.workflows ?? [];
  const connectionId = benchmarkConfiguration.connection[0];

  const benchmarkFolder = await ensureBenchmarkFolder(
    projectId,
    getBenchmarkFolderDisplayName(provider),
  );

  await deleteFlowsForExistingBenchmark({
    projectId,
    provider,
    folderId: benchmarkFolder.id,
    userId,
  });

  const workflows = await createBenchmarkWorkflows({
    provider,
    workflowIds,
    connectionId,
    projectId,
    folderId: benchmarkFolder.id,
  });

  const payload = buildBenchmarkPayload({
    benchmarkConfiguration,
    workflows,
    webhookBaseUrl,
  });

  const benchmark = await insertBenchmarkRecords({
    projectId,
    provider,
    folderId: benchmarkFolder.id,
    connectionId,
    payload,
    workflows,
  });

  return {
    benchmarkId: benchmark.id,
    folderId: benchmarkFolder.id,
    provider,
    workflows,
    webhookPayload: payload,
  };
}
