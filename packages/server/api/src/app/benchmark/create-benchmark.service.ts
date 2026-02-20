import { logger } from '@openops/server-shared';
import {
  BenchmarkConfiguration,
  ContentType,
  CreateBenchmarkResponse,
  openOpsId,
  PopulatedFlow,
  TriggerWithOptionalId,
} from '@openops/shared';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { flowService } from '../flows/flow/flow.service';
import { flowFolderService } from '../flows/folder/folder.service';
import { benchmarkFlowRepo } from './benchmark-flow.repo';
import { benchmarkRepo } from './benchmark.repo';

const CATALOG_BASE_PATH = path.join(__dirname, 'workflows-catalog');
const ORCHESTRATOR_CATALOG_NAME = 'Run AWS Benchmark - orchestrator';
const CLEANUP_CATALOG_NAME = 'Clean-up AWS Benchmark data';
const BENCHMARK_FOLDER_NAME = 'AWS Benchmark';

type WorkflowTemplate = {
  template: {
    displayName: string;
    description?: string;
    trigger: TriggerWithOptionalId;
  };
};

export async function createBenchmark(
  provider: string,
  benchmarkConfiguration: BenchmarkConfiguration,
  projectId: string,
  userId: string,
): Promise<CreateBenchmarkResponse> {
  const connectionId = benchmarkConfiguration['connection']?.[0];
  const regions = benchmarkConfiguration['regions'] ?? [];
  const accounts = benchmarkConfiguration['accounts'] ?? [];
  const catalogPath = path.join(CATALOG_BASE_PATH, provider);
  const requestedWorkflows = benchmarkConfiguration['workflows'] ?? [];
  const selectedWorkflows =
    requestedWorkflows.length > 0
      ? requestedWorkflows
      : getAllSubWorkflowNames(catalogPath);

  logger.info('Creating benchmark', { provider, projectId, selectedWorkflows });

  const folder = await getOrCreateBenchmarkFolder(projectId);
  await deleteWorkflowsInFolder(projectId, userId, folder.id);

  const connectionIds = connectionId ? [connectionId] : [];

  const orchestratorFlow = await importWorkflowFromCatalog(
    catalogPath,
    ORCHESTRATOR_CATALOG_NAME,
    connectionIds,
    projectId,
    userId,
    folder.id,
  );

  const cleanupFlow = await importWorkflowFromCatalog(
    catalogPath,
    CLEANUP_CATALOG_NAME,
    connectionIds,
    projectId,
    userId,
    folder.id,
  );

  const subWorkflowFlows = await importSubWorkflows(
    catalogPath,
    selectedWorkflows,
    connectionIds,
    projectId,
    userId,
    folder.id,
  );

  const allFlows = [orchestratorFlow, cleanupFlow, ...subWorkflowFlows];
  await publishAllFlows(allFlows, userId, projectId);

  const benchmarkId = openOpsId();
  await benchmarkRepo().save({
    id: benchmarkId,
    projectId,
    provider,
    folderId: folder.id,
    connectionId: connectionId ?? null,
    payload: { regions, accounts, workflows: selectedWorkflows },
    deletedAt: null,
    lastRunId: null,
  });

  await benchmarkFlowRepo().save([
    {
      id: openOpsId(),
      benchmarkId,
      flowId: orchestratorFlow.id,
      isOrchestrator: true,
      deletedAt: null,
    },
    {
      id: openOpsId(),
      benchmarkId,
      flowId: cleanupFlow.id,
      isOrchestrator: false,
      deletedAt: null,
    },
    ...subWorkflowFlows.map((flow) => ({
      id: openOpsId(),
      benchmarkId,
      flowId: flow.id,
      isOrchestrator: false,
      deletedAt: null,
    })),
  ]);

  logger.info('Benchmark created', { benchmarkId, folderId: folder.id });

  return {
    benchmarkId,
    folderId: folder.id,
    workflows: [
      {
        flowId: orchestratorFlow.id,
        displayName: orchestratorFlow.version.displayName,
        isOrchestrator: true,
      },
      ...subWorkflowFlows.map((flow) => ({
        flowId: flow.id,
        displayName: flow.version.displayName,
        isOrchestrator: false,
      })),
    ],
    webhookPayload: {
      workflows: subWorkflowFlows.map((f) => f.id),
      cleanupWorkflows: [cleanupFlow.id],
      accounts,
      regions,
    },
  };
}

function getAllSubWorkflowNames(catalogPath: string): string[] {
  const excluded = new Set([ORCHESTRATOR_CATALOG_NAME, CLEANUP_CATALOG_NAME]);
  return fs
    .readdirSync(catalogPath)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .filter((name) => !excluded.has(name));
}

async function getOrCreateBenchmarkFolder(
  projectId: string,
): Promise<{ id: string }> {
  const existingFolder =
    await flowFolderService.getOneByDisplayNameCaseInsensitive({
      projectId,
      displayName: BENCHMARK_FOLDER_NAME,
      contentType: ContentType.WORKFLOW,
    });

  if (existingFolder) {
    return existingFolder;
  }

  return flowFolderService.create({
    projectId,
    request: {
      displayName: BENCHMARK_FOLDER_NAME,
      contentType: ContentType.WORKFLOW,
    },
  });
}

async function deleteWorkflowsInFolder(
  projectId: string,
  userId: string,
  folderId: string,
): Promise<void> {
  const existingFlows = await flowService.list({
    projectId,
    cursorRequest: null,
    limit: 200,
    folderId,
    status: undefined,
    name: undefined,
    versionState: null,
  });

  for (const flow of existingFlows.data) {
    await flowService.delete({ id: flow.id, projectId, userId });
  }
}

async function importSubWorkflows(
  catalogPath: string,
  selectedWorkflows: string[],
  connectionIds: string[],
  projectId: string,
  userId: string,
  folderId: string,
): Promise<PopulatedFlow[]> {
  const flows: PopulatedFlow[] = [];

  for (const workflowName of selectedWorkflows) {
    const flow = await importWorkflowFromCatalog(
      catalogPath,
      workflowName,
      connectionIds,
      projectId,
      userId,
      folderId,
    );
    flows.push(flow);
  }

  return flows;
}

async function importWorkflowFromCatalog(
  catalogPath: string,
  workflowName: string,
  connectionIds: string[],
  projectId: string,
  userId: string,
  folderId: string,
): Promise<PopulatedFlow> {
  const filePath = path.join(catalogPath, `${workflowName}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Workflow catalog file not found: ${filePath}`);
  }

  const catalogEntry = JSON.parse(
    fs.readFileSync(filePath, 'utf-8'),
  ) as WorkflowTemplate;

  return flowService.createFromTrigger({
    projectId,
    userId,
    displayName: catalogEntry.template.displayName,
    description: catalogEntry.template.description,
    trigger: catalogEntry.template.trigger,
    connectionIds,
    folderId,
  });
}

async function publishAllFlows(
  flows: PopulatedFlow[],
  userId: string,
  projectId: string,
): Promise<void> {
  for (const flow of flows) {
    await flowService.updatedPublishedVersionId({
      id: flow.id,
      userId,
      projectId,
    });
  }
}
