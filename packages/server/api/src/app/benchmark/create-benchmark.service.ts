import {
  ApplicationError,
  BenchmarkProviders,
  ContentType,
  ErrorCode,
  Folder,
  openOpsId,
  type BenchmarkConfiguration,
  type BenchmarkCreationResult,
  type BenchmarkWorkflowBase,
} from '@openops/shared';
import fs from 'node:fs/promises';
import { IsNull } from 'typeorm';
import { flowService } from '../flows/flow/flow.service';
import { flowFolderService } from '../flows/folder/folder.service';
import {
  bulkCreateAndPublishFlows,
  type WorkflowTemplate,
} from './benchmark-flow-bulk-create';
import { benchmarkFlowRepo } from './benchmark-flow.repo';
import { benchmarkRepo } from './benchmark.repo';
import type { ResolvedWorkflowPath } from './catalog-resolver';
import { resolveWorkflowPathsForSeed } from './catalog-resolver';
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
    .select(['b.id AS benchmarkId', 'bf.flowId AS flowId'])
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

export async function seedBenchmarkWorkflowsFromCatalog(params: {
  paths: ResolvedWorkflowPath[];
  connectionId: string;
  projectId: string;
  folderId: string;
}): Promise<BenchmarkWorkflowBase[]> {
  const { paths, connectionId, projectId, folderId } = params;

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
  const templates = await Promise.all(parsedTemplates);

  const results = await bulkCreateAndPublishFlows(
    templates,
    [connectionId],
    projectId,
    folderId,
  );

  return results.map((r, index) => ({
    flowId: r.id,
    displayName: r.version.displayName,
    isOrchestrator: index === 0,
  }));
}

export async function createBenchmark(params: {
  provider: string;
  projectId: string;
  userId: string;
  benchmarkConfiguration: BenchmarkConfiguration;
}): Promise<BenchmarkCreationResult> {
  const { provider, projectId, userId, benchmarkConfiguration } = params;

  validateBenchmarkConfiguration(benchmarkConfiguration);

  const workflowIds = benchmarkConfiguration.workflows ?? [];
  const connectionId = benchmarkConfiguration.connection?.[0];

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

  const paths = resolveWorkflowPathsForSeed(provider, workflowIds);
  const workflows = await seedBenchmarkWorkflowsFromCatalog({
    paths,
    connectionId,
    projectId,
    folderId: benchmarkFolder.id,
  });

  return {
    benchmarkId: openOpsId(),
    folderId: benchmarkFolder.id,
    provider,
    workflows,
    webhookPayload: {
      webhookBaseUrl: '',
      workflows: [],
      cleanupWorkflows: [],
      accounts: benchmarkConfiguration.accounts ?? [],
      regions: benchmarkConfiguration.regions ?? [],
    },
  };
}
