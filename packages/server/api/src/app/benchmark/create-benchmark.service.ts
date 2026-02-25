import {
  BenchmarkProviders,
  ContentType,
  CreateBenchmarkResponse,
  FolderDto,
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
): Promise<FolderDto> {
  const existingFolder =
    await flowFolderService.getOneByDisplayNameCaseInsensitive({
      projectId,
      displayName,
      contentType: ContentType.WORKFLOW,
    });

  if (existingFolder) {
    return flowFolderService.getOneOrThrow({
      projectId,
      folderId: existingFolder.id,
    });
  }

  return flowFolderService.create({
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
