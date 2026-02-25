import {
  ApplicationError,
  BenchmarkProviders,
  ContentType,
  CreateBenchmarkResponse,
  ErrorCode,
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
  let existingFolder =
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

  try {
    return await flowFolderService.create({
      projectId,
      request: {
        displayName,
        contentType: ContentType.WORKFLOW,
      },
    });
  } catch (err) {
    if (
      err instanceof ApplicationError &&
      err.error.code === ErrorCode.FOLDER_ALREADY_EXISTS
    ) {
      existingFolder =
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
    }
    throw err;
  }
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
