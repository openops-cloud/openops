import {
  ApplicationError,
  type BenchmarkCreationResult,
  BenchmarkProviders,
  type BenchmarkWorkflowBase,
  ContentType,
  ErrorCode,
  Folder,
  type WizardState,
} from '@openops/shared';
import { IsNull } from 'typeorm';
import { getConnectionsWithBlockSupport } from '../app-connection/connections-with-block-support';
import {
  bulkCreateAndPublishFlows,
  loadWorkflowTemplate,
  type WorkflowTemplate,
} from '../flows/flow/flow-bulk-create';
import { flowService } from '../flows/flow/flow.service';
import { flowFolderService } from '../flows/folder/folder.service';
import { createBenchmarkDashboard } from '../openops-analytics/benchmark/benchmark-dashboard-service';
import { attachFlowsToBenchmark } from './attach-benchmark-flows.service';
import { benchmarkFlowRepo } from './benchmark-flow.repo';
import { benchmarkRepo } from './benchmark.repo';
import {
  type CategorizedWorkflowPaths,
  resolveWorkflowPathsForSeed,
} from './catalog-resolver';
import { throwValidationError } from './errors';

function validateBenchmarkConfiguration(config: WizardState): void {
  const connection = config.connection ?? [];
  const workflows = config.workflows ?? [];
  const regions = config.regions ?? [];
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
  if (regions.length === 0) {
    throwValidationError(
      'You must select at least one region to create a benchmark',
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
  switch (provider) {
    case BenchmarkProviders.AWS:
      return 'AWS Benchmark';
    case BenchmarkProviders.AZURE:
      return 'Azure Benchmark';
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

type CategorizedWorkflowTemplates = {
  orchestrator: WorkflowTemplate;
  cleanup: WorkflowTemplate;
  subWorkflows: WorkflowTemplate[];
};

async function loadWorkflowTemplates(
  categorizedPaths: CategorizedWorkflowPaths,
): Promise<CategorizedWorkflowTemplates> {
  const [orchestrator, cleanup, ...subWorkflows] = await Promise.all([
    loadWorkflowTemplate(categorizedPaths.orchestrator.filePath),
    loadWorkflowTemplate(categorizedPaths.cleanup.filePath),
    ...categorizedPaths.subWorkflows.map((path) =>
      loadWorkflowTemplate(path.filePath),
    ),
  ]);

  return {
    orchestrator,
    cleanup,
    subWorkflows,
  };
}

type CategorizedFlowResults = {
  orchestrator: { id: string; displayName: string };
  cleanup: { id: string; displayName: string };
  subWorkflows: Array<{ id: string; displayName: string }>;
};

async function createCategorizedWorkflows(
  templates: CategorizedWorkflowTemplates,
  connections: Awaited<ReturnType<typeof getConnectionsWithBlockSupport>>,
  projectId: string,
  folderId: string,
): Promise<CategorizedFlowResults> {
  const allTemplates = [
    templates.orchestrator,
    templates.cleanup,
    ...templates.subWorkflows,
  ];

  const allResults = await bulkCreateAndPublishFlows(
    allTemplates,
    connections,
    projectId,
    folderId,
  );

  const orchestratorIndex = 0;
  const cleanupIndex = 1;
  const subWorkflowStartIndex = 2;

  return {
    orchestrator: {
      id: allResults[orchestratorIndex].id,
      displayName: allResults[orchestratorIndex].version.displayName,
    },
    cleanup: {
      id: allResults[cleanupIndex].id,
      displayName: allResults[cleanupIndex].version.displayName,
    },
    subWorkflows: allResults.slice(subWorkflowStartIndex).map((r) => ({
      id: r.id,
      displayName: r.version.displayName,
    })),
  };
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
    throwValidationError('At least one workflow is required');
  }

  const categorizedPaths = resolveWorkflowPathsForSeed(provider, workflowIds);
  const templates = await loadWorkflowTemplates(categorizedPaths);

  const connections = await getConnectionsWithBlockSupport(projectId, [
    connectionId,
  ]);

  const results = await createCategorizedWorkflows(
    templates,
    connections,
    projectId,
    folderId,
  );

  return [
    {
      flowId: results.orchestrator.id,
      displayName: results.orchestrator.displayName,
      isOrchestrator: true,
      isCleanup: false,
    },
    {
      flowId: results.cleanup.id,
      displayName: results.cleanup.displayName,
      isOrchestrator: false,
      isCleanup: true,
    },
    ...results.subWorkflows.map((sw) => ({
      flowId: sw.id,
      displayName: sw.displayName,
      isOrchestrator: false,
      isCleanup: false,
    })),
  ];
}

export async function createBenchmark(params: {
  provider: BenchmarkProviders;
  projectId: string;
  userId: string;
  wizardState: WizardState;
}): Promise<BenchmarkCreationResult> {
  const { provider, projectId, userId, wizardState } = params;

  validateBenchmarkConfiguration(wizardState);

  const workflowIds = wizardState.workflows ?? [];
  const connectionId = wizardState.connection[0];

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

  let result: BenchmarkCreationResult;
  try {
    const { benchmark, payload } = await attachFlowsToBenchmark({
      wizardState,
      workflows,
      projectId,
      provider,
      folderId: benchmarkFolder.id,
      connectionId,
    });

    result = {
      benchmarkId: benchmark.id,
      folderId: benchmarkFolder.id,
      provider,
      workflows,
      webhookPayload: payload,
    };
  } catch (err) {
    await deleteFlowsByIds({
      flowIds: workflows.map((w) => w.flowId),
      projectId,
      userId,
    });
    throw err;
  }

  await createBenchmarkDashboard(provider);
  return result;
}
