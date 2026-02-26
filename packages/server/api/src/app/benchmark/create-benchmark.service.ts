import {
  ApplicationError,
  BenchmarkCreationResult,
  BenchmarkProviders,
  ContentType,
  ErrorCode,
  Folder,
  openOpsId,
} from '@openops/shared';
import { IsNull } from 'typeorm';
import { flowService } from '../flows/flow/flow.service';
import { flowFolderService } from '../flows/folder/folder.service';
import { benchmarkFlowRepo } from './benchmark-flow.repo';
import { benchmarkRepo } from './benchmark.repo';
import { throwValidationError } from './errors';

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

  const existingBenchmark = await benchmarkRepo().findOne({
    where: {
      projectId,
      provider,
      folderId,
      deletedAt: IsNull(),
    },
  });

  if (!existingBenchmark) {
    return;
  }

  const benchmarkFlowRows = await benchmarkFlowRepo().find({
    where: {
      benchmarkId: existingBenchmark.id,
      deletedAt: IsNull(),
    },
  });

  const now = new Date().toISOString();

  await deleteFlowsByIds({
    flowIds: benchmarkFlowRows.map((flowRow) => flowRow.flowId),
    projectId,
    userId,
  });

  await benchmarkFlowRepo().update(
    { benchmarkId: existingBenchmark.id, deletedAt: IsNull() },
    { deletedAt: now },
  );

  await benchmarkRepo().update(
    { id: existingBenchmark.id, deletedAt: IsNull() },
    { deletedAt: now },
  );
}

export async function createBenchmark(params: {
  provider: string;
  projectId: string;
  userId: string;
}): Promise<BenchmarkCreationResult> {
  const { provider, projectId, userId } = params;

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

  return {
    benchmarkId: openOpsId(),
    folderId: benchmarkFolder.id,
    provider,
    workflows: [],
    webhookPayload: {
      webhookBaseUrl: '',
      workflows: [],
      cleanupWorkflows: [],
      accounts: [],
      regions: [],
    },
  };
}
