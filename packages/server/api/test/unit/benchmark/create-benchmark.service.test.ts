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

const mockBenchmarkFlowRepo = {
  find: jest.fn(),
  update: jest.fn(),
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
  benchmarkRepo: () => mockBenchmarkRepo,
}));

jest.mock('../../../src/app/benchmark/benchmark-flow.repo', () => ({
  benchmarkFlowRepo: () => mockBenchmarkFlowRepo,
}));

const flowFolderServiceMock = flowFolderService as jest.Mocked<
  typeof flowFolderService
>;
const flowServiceMock = flowService as jest.Mocked<typeof flowService>;

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

  describe('deleteFlowsForExistingBenchmark', () => {
    const params = {
      projectId: 'project-1',
      provider: 'aws',
      folderId: 'folder-1',
      userId: 'user-1',
    };

    it('returns without calling delete or update when no existing benchmark', async () => {
      mockBenchmarkRepo.findOne.mockResolvedValue(null);

      await deleteFlowsForExistingBenchmark(params);

      expect(mockBenchmarkRepo.findOne).toHaveBeenCalledWith({
        where: {
          projectId: params.projectId,
          provider: params.provider,
          folderId: params.folderId,
          deletedAt: expect.anything(),
        },
      });
      expect(mockBenchmarkFlowRepo.find).not.toHaveBeenCalled();
      expect(flowServiceMock.delete).not.toHaveBeenCalled();
      expect(mockBenchmarkFlowRepo.update).not.toHaveBeenCalled();
      expect(mockBenchmarkRepo.update).not.toHaveBeenCalled();
    });

    it('soft-deletes benchmark and benchmark_flow when no flows', async () => {
      const benchmark = {
        id: 'bench-1',
        projectId: params.projectId,
        provider: params.provider,
        folderId: params.folderId,
      };
      mockBenchmarkRepo.findOne.mockResolvedValue(benchmark);
      mockBenchmarkFlowRepo.find.mockResolvedValue([]);

      await deleteFlowsForExistingBenchmark(params);

      expect(mockBenchmarkFlowRepo.find).toHaveBeenCalledWith({
        where: {
          benchmarkId: benchmark.id,
          deletedAt: expect.anything(),
        },
      });
      expect(flowServiceMock.delete).not.toHaveBeenCalled();
      expect(mockBenchmarkFlowRepo.update).toHaveBeenCalledWith(
        { benchmarkId: benchmark.id },
        expect.objectContaining({ deletedAt: expect.any(String) }),
      );
      expect(mockBenchmarkRepo.update).toHaveBeenCalledWith(
        { id: benchmark.id },
        expect.objectContaining({ deletedAt: expect.any(String) }),
      );
    });

    it('deletes flows, soft-deletes benchmark_flow and benchmark when flows exist', async () => {
      const benchmark = {
        id: 'bench-1',
        projectId: params.projectId,
        provider: params.provider,
        folderId: params.folderId,
      };
      const benchmarkFlowRows = [
        { id: 'bf-1', benchmarkId: benchmark.id, flowId: 'flow-1' },
        { id: 'bf-2', benchmarkId: benchmark.id, flowId: 'flow-2' },
      ];
      mockBenchmarkRepo.findOne.mockResolvedValue(benchmark);
      mockBenchmarkFlowRepo.find.mockResolvedValue(benchmarkFlowRows);
      flowServiceMock.delete.mockResolvedValue(undefined);

      await deleteFlowsForExistingBenchmark(params);

      expect(flowServiceMock.delete).toHaveBeenCalledTimes(2);
      expect(flowServiceMock.delete).toHaveBeenNthCalledWith(1, {
        id: 'flow-1',
        projectId: params.projectId,
        userId: params.userId,
      });
      expect(flowServiceMock.delete).toHaveBeenNthCalledWith(2, {
        id: 'flow-2',
        projectId: params.projectId,
        userId: params.userId,
      });
      expect(mockBenchmarkFlowRepo.update).toHaveBeenCalledWith(
        { benchmarkId: benchmark.id },
        expect.objectContaining({ deletedAt: expect.any(String) }),
      );
      expect(mockBenchmarkRepo.update).toHaveBeenCalledWith(
        { id: benchmark.id },
        expect.objectContaining({ deletedAt: expect.any(String) }),
      );
    });
  });
});
