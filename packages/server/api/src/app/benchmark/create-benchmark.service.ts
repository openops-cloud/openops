import {
  BenchmarkCreationResult,
  BenchmarkProviders,
  ContentType,
  Folder,
  openOpsId,
} from '@openops/shared';
import { IsNull } from 'typeorm';
import { flowService } from '../flows/flow/flow.service';
import { flowFolderService } from '../flows/folder/folder.service';
import { benchmarkFlowRepo } from './benchmark-flow.repo';
import { benchmarkRepo } from './benchmark.repo';
import { throwValidationError } from './errors';

export type DeleteFlowsForExistingBenchmarkParams = {
  projectId: string;
  provider: string;
  folderId: string;
  userId: string;
};

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

/**
 * Finds the existing benchmark for project/provider/folder (if any), deletes
 * only those flows via flowService.delete, then soft-deletes the corresponding
 * benchmark_flow rows and the benchmark row. User-added, non-benchmark flows
 * in the folder are left untouched.
 */
export async function deleteFlowsForExistingBenchmark(
  params: DeleteFlowsForExistingBenchmarkParams,
): Promise<void> {
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

  for (const bf of benchmarkFlowRows) {
    await flowService.delete({
      id: bf.flowId,
      projectId,
      userId,
    });
  }

  await benchmarkFlowRepo().update(
    { benchmarkId: existingBenchmark.id },
    { deletedAt: now },
  );

  await benchmarkRepo().update(
    { id: existingBenchmark.id },
    { deletedAt: now },
  );
}

export async function createBenchmark(params: {
  provider: string;
  projectId: string;
}): Promise<BenchmarkCreationResult> {
  const { provider, projectId } = params;

  const benchmarkFolder = await ensureBenchmarkFolder(
    projectId,
    getBenchmarkFolderDisplayName(provider),
  );

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
