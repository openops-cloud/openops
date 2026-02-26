import { ContentType, type Folder } from '@openops/shared';
import { createBenchmark } from '../../../src/app/benchmark/create-benchmark.service';
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

  it('createBenchmark with provider aws calls getOrCreate with displayName AWS Benchmark', async () => {
    const projectId = 'project-1';
    const folder: Folder = {
      id: 'folder-1',
      projectId,
      displayName: 'AWS Benchmark',
      created: '',
      updated: '',
      contentType: ContentType.WORKFLOW,
    };
    flowFolderServiceMock.getOrCreate.mockResolvedValue(folder);

    await createBenchmark({ provider: 'aws', projectId });

    expect(flowFolderServiceMock.getOrCreate).toHaveBeenCalledWith({
      projectId,
      request: {
        displayName: 'AWS Benchmark',
        contentType: ContentType.WORKFLOW,
      },
    });
  });

  it('createBenchmark throws for unknown provider', async () => {
    const projectId = 'project-1';
    await expect(
      createBenchmark({ provider: 'gcp', projectId }),
    ).rejects.toThrow('Unknown provider: gcp');
    expect(flowFolderServiceMock.getOrCreate).not.toHaveBeenCalled();
  });

  it('createBenchmark returns BenchmarkCreationResult', async () => {
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

    expect(flowFolderServiceMock.getOrCreate).toHaveBeenCalledWith({
      projectId,
      request: {
        displayName: 'AWS Benchmark',
        contentType: ContentType.WORKFLOW,
      },
    });
    expect(result.folderId).toBe(folder.id);
    expect(result.workflows).toEqual([]);
    expect(result.benchmarkId).toBeDefined();
    expect(result.provider).toBe('aws');
    expect(result.webhookPayload).toEqual({
      webhookBaseUrl: '',
      workflows: [],
      cleanupWorkflows: [],
      accounts: [],
      regions: [],
    });
  });
});
