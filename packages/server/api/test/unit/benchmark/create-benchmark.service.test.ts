import { ContentType, type Folder } from '@openops/shared';
import {
  createBenchmark,
  ensureBenchmarkFolder,
  getBenchmarkFolderDisplayName,
} from '../../../src/app/benchmark/create-benchmark.service';
import { flowFolderService } from '../../../src/app/flows/folder/folder.service';

jest.mock('../../../src/app/flows/folder/folder.service', () => ({
  flowFolderService: {
    getOrCreate: jest.fn(),
  },
}));

const flowFolderServiceMock = flowFolderService as jest.Mocked<
  typeof flowFolderService
>;

describe('create-benchmark.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns AWS Benchmark for aws provider (case-insensitive)', () => {
    expect(getBenchmarkFolderDisplayName('aws')).toBe('AWS Benchmark');
    expect(getBenchmarkFolderDisplayName('AWS')).toBe('AWS Benchmark');
  });

  it('throws validation error for unknown provider', () => {
    expect(() => getBenchmarkFolderDisplayName('gcp')).toThrow(
      'Unknown provider: gcp',
    );
  });

  it('ensureBenchmarkFolder calls getOrCreate and returns the folder', async () => {
    const projectId = 'project-1';
    const displayName = 'AWS Benchmark';
    const folder: Folder = {
      id: 'folder-1',
      projectId,
      displayName,
      created: '',
      updated: '',
      contentType: ContentType.WORKFLOW,
    };

    flowFolderServiceMock.getOrCreate.mockResolvedValue(folder);

    const result = await ensureBenchmarkFolder(projectId, displayName);

    expect(flowFolderServiceMock.getOrCreate).toHaveBeenCalledWith({
      projectId,
      request: {
        displayName,
        contentType: ContentType.WORKFLOW,
      },
    });
    expect(result).toEqual(folder);
  });

  it('createBenchmark returns benchmarkId, folderId from folder, and empty workflows', async () => {
    const projectId = 'project-1';
    const folder: Folder = {
      id: 'folder-2',
      projectId,
      displayName: 'AWS Benchmark',
      created: '',
      updated: '',
      contentType: ContentType.WORKFLOW,
    };

    flowFolderServiceMock.getOrCreate.mockResolvedValue(folder);

    const result = await createBenchmark({
      provider: 'aws',
      projectId,
    });

    expect(result.folderId).toBe(folder.id);
    expect(result.workflows).toEqual([]);
    expect(result.benchmarkId).toBeDefined();
  });
});
