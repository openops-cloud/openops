import { ContentType, type Folder } from '@openops/shared';
import {
  createBenchmark,
  deleteFlowsForExistingBenchmark,
} from '../../../src/app/benchmark/create-benchmark.service';
import { flowService } from '../../../src/app/flows/flow/flow.service';
import { flowFolderService } from '../../../src/app/flows/folder/folder.service';

const mockBenchmarkRepo = {
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockGetRawMany = jest.fn();
const mockBenchmarkFlowRepo = {
  find: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn().mockImplementation(() => ({
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: mockGetRawMany,
  })),
};

jest.mock('../../../src/app/flows/folder/folder.service', () => ({
  flowFolderService: {
    getOrCreate: jest.fn(),
  },
}));

jest.mock('../../../src/app/flows/flow/flow.service', () => ({
  flowService: {
    delete: jest.fn(),
  },
}));

jest.mock('../../../src/app/benchmark/benchmark.repo', () => ({
  benchmarkRepo: (): typeof mockBenchmarkRepo => mockBenchmarkRepo,
}));

jest.mock('../../../src/app/benchmark/benchmark-flow.repo', () => ({
  benchmarkFlowRepo: (): typeof mockBenchmarkFlowRepo => mockBenchmarkFlowRepo,
}));

const flowFolderServiceMock = flowFolderService as jest.Mocked<
  typeof flowFolderService
>;
const flowServiceMock = flowService as jest.Mocked<typeof flowService>;

describe('create-benchmark.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRawMany.mockResolvedValue([]);
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

    await createBenchmark({
      provider: 'aws',
      projectId,
      userId: 'user-1',
    });

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
      createBenchmark({
        provider: 'gcp',
        projectId,
        userId: 'user-1',
      }),
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
      userId: 'user-1',
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

  const deleteFlowsParams = {
    projectId: 'project-1',
    provider: 'aws',
    folderId: 'folder-1',
    userId: 'user-1',
  };

  it('returns without calling delete or update when join returns no rows', async () => {
    mockGetRawMany.mockResolvedValue([]);

    await deleteFlowsForExistingBenchmark(deleteFlowsParams);

    expect(mockBenchmarkFlowRepo.createQueryBuilder).toHaveBeenCalledWith('bf');
    expect(flowServiceMock.delete).not.toHaveBeenCalled();
    expect(mockBenchmarkFlowRepo.update).not.toHaveBeenCalled();
    expect(mockBenchmarkRepo.update).not.toHaveBeenCalled();
  });

  it('deletes flows, soft-deletes benchmark_flow and benchmark when flows exist', async () => {
    const benchmarkId = 'bench-1';
    mockGetRawMany.mockResolvedValue([
      { benchmarkId, flowId: 'flow-1' },
      { benchmarkId, flowId: 'flow-2' },
    ]);
    flowServiceMock.delete.mockResolvedValue(undefined);

    await deleteFlowsForExistingBenchmark(deleteFlowsParams);

    expect(flowServiceMock.delete).toHaveBeenCalledTimes(2);
    expect(flowServiceMock.delete).toHaveBeenNthCalledWith(1, {
      id: 'flow-1',
      projectId: deleteFlowsParams.projectId,
      userId: deleteFlowsParams.userId,
    });
    expect(flowServiceMock.delete).toHaveBeenNthCalledWith(2, {
      id: 'flow-2',
      projectId: deleteFlowsParams.projectId,
      userId: deleteFlowsParams.userId,
    });
    expect(mockBenchmarkFlowRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        benchmarkId,
        deletedAt: expect.anything(),
      }),
      expect.objectContaining({ deletedAt: expect.any(String) }),
    );
    expect(mockBenchmarkRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: benchmarkId,
        deletedAt: expect.anything(),
      }),
      expect.objectContaining({ deletedAt: expect.any(String) }),
    );
  });
});
