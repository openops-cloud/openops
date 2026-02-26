import {
  BenchmarkProviders,
  ContentType,
  CreateBenchmarkResponse,
  Folder,
  openOpsId,
} from '@openops/shared';
import { flowFolderService } from '../flows/folder/folder.service';
import { throwValidationError } from './errors';

export function getBenchmarkFolderDisplayName(provider: string): string {
  const normalizedProvider = provider.toLowerCase();
  switch (normalizedProvider) {
    case BenchmarkProviders.AWS:
      return 'AWS Benchmark';
    default:
      throwValidationError(`Unknown provider: ${provider}`);
  }
}

export async function ensureBenchmarkFolder(
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

export async function createBenchmark(params: {
  provider: string;
  projectId: string;
}): Promise<CreateBenchmarkResponse> {
  const { provider, projectId } = params;

  const benchmarkFolder = await ensureBenchmarkFolder(
    projectId,
    getBenchmarkFolderDisplayName(provider),
  );

  return {
    benchmarkId: openOpsId(),
    folderId: benchmarkFolder.id,
    workflows: [],
  };
}
