import { ContentType, type Folder } from '@openops/shared';
import {
  createBenchmark,
  createBenchmarkWorkflows,
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

const mockResolveWorkflowPathsForSeed = jest.fn();
const mockBulkCreateAndPublishFlows = jest.fn();
const mockReadFile = jest.fn();

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

jest.mock('../../../src/app/benchmark/catalog-resolver', () => ({
  resolveWorkflowPathsForSeed: (
    ...args: unknown[]
  ): ReturnType<typeof mockResolveWorkflowPathsForSeed> =>
    mockResolveWorkflowPathsForSeed(...args),
}));

const mockGetConnectionsWithBlockSupport = jest.fn();
jest.mock(
  '../../../src/app/benchmark/connections-with-supported-blocks',
  () => ({
    getConnectionsWithBlockSupport: (
      ...args: unknown[]
    ): ReturnType<typeof mockGetConnectionsWithBlockSupport> =>
      mockGetConnectionsWithBlockSupport(...args),
  }),
);

jest.mock('../../../src/app/benchmark/benchmark-flow-bulk-create', () => ({
  bulkCreateAndPublishFlows: (
    ...args: unknown[]
  ): ReturnType<typeof mockBulkCreateAndPublishFlows> =>
    mockBulkCreateAndPublishFlows(...args),
}));

jest.mock('node:fs/promises', () => ({
  readFile: (...args: unknown[]): ReturnType<typeof mockReadFile> =>
    mockReadFile(...args),
}));

const flowFolderServiceMock = flowFolderService as jest.Mocked<
  typeof flowFolderService
>;
const flowServiceMock = flowService as jest.Mocked<typeof flowService>;

const defaultBenchmarkConfiguration = {
  connection: ['conn-1'],
  workflows: ['AWS Benchmark - Unattached EBS'],
  accounts: [] as string[],
  regions: [] as string[],
};

const createBenchmarkMockConnections = [
  {
    id: 'conn-1',
    name: 'Test connection',
    authProviderKey: 'aws',
    supportedBlocks: [] as string[],
  },
];

function setupCreateBenchmarkMocks(folder: Folder): void {
  flowFolderServiceMock.getOrCreate.mockResolvedValue(folder);
  mockGetConnectionsWithBlockSupport.mockResolvedValue(
    createBenchmarkMockConnections,
  );
  mockResolveWorkflowPathsForSeed.mockReturnValue([
    { id: 'orchestrator', filePath: '/catalog/orchestrator.json' },
    { id: 'cleanup', filePath: '/catalog/cleanup.json' },
    { id: 'sub', filePath: '/catalog/sub.json' },
  ]);
  mockReadFile.mockResolvedValue(
    JSON.stringify({
      template: {
        displayName: 'Test Workflow',
        trigger: { type: 'WEBHOOK', name: 'trigger' },
      },
    }),
  );
  mockBulkCreateAndPublishFlows.mockResolvedValue([
    { id: 'flow-1', version: { id: 'v1', displayName: 'Orchestrator' } },
    { id: 'flow-2', version: { id: 'v2', displayName: 'Cleanup' } },
    { id: 'flow-3', version: { id: 'v3', displayName: 'Sub' } },
  ]);
}

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
    setupCreateBenchmarkMocks(folder);

    await createBenchmark({
      provider: 'aws',
      projectId,
      userId: 'user-1',
      benchmarkConfiguration: defaultBenchmarkConfiguration,
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
        benchmarkConfiguration: defaultBenchmarkConfiguration,
      }),
    ).rejects.toThrow('Unknown provider: gcp');
    expect(flowFolderServiceMock.getOrCreate).not.toHaveBeenCalled();
  });

  it('createBenchmark throws when connection is empty', async () => {
    await expect(
      createBenchmark({
        provider: 'aws',
        projectId: 'project-1',
        userId: 'user-1',
        benchmarkConfiguration: {
          ...defaultBenchmarkConfiguration,
          connection: [],
        },
      }),
    ).rejects.toThrow(
      'You must select at least one connection to create a benchmark',
    );
    expect(flowFolderServiceMock.getOrCreate).not.toHaveBeenCalled();
  });

  it('createBenchmark throws when workflows is empty', async () => {
    await expect(
      createBenchmark({
        provider: 'aws',
        projectId: 'project-1',
        userId: 'user-1',
        benchmarkConfiguration: {
          ...defaultBenchmarkConfiguration,
          workflows: [],
        },
      }),
    ).rejects.toThrow(
      'You must select at least one workflow to create a benchmark',
    );
    expect(flowFolderServiceMock.getOrCreate).not.toHaveBeenCalled();
  });

  it('createBenchmark returns BenchmarkCreationResult with workflows from seed', async () => {
    const projectId = 'project-1';
    const folder: Folder = {
      id: 'folder-2',
      projectId,
      displayName: 'AWS Benchmark',
      created: '',
      updated: '',
      contentType: ContentType.WORKFLOW,
    };
    setupCreateBenchmarkMocks(folder);

    const result = await createBenchmark({
      provider: 'aws',
      projectId,
      userId: 'user-1',
      benchmarkConfiguration: defaultBenchmarkConfiguration,
    });

    expect(flowFolderServiceMock.getOrCreate).toHaveBeenCalledWith({
      projectId,
      request: {
        displayName: 'AWS Benchmark',
        contentType: ContentType.WORKFLOW,
      },
    });
    expect(result.folderId).toBe(folder.id);
    expect(result.workflows).toEqual([
      { flowId: 'flow-1', displayName: 'Orchestrator', isOrchestrator: true },
      { flowId: 'flow-2', displayName: 'Cleanup', isOrchestrator: false },
      { flowId: 'flow-3', displayName: 'Sub', isOrchestrator: false },
    ]);
    expect(result.benchmarkId).toBeDefined();
    expect(result.provider).toBe('aws');
    expect(result.webhookPayload).toEqual({
      webhookBaseUrl: '',
      workflows: [],
      cleanupWorkflows: [],
      accounts: [],
      regions: [],
    });
    expect(mockBenchmarkFlowRepo.createQueryBuilder).toHaveBeenCalledWith('bf');
    expect(mockResolveWorkflowPathsForSeed).toHaveBeenCalledWith(
      'aws',
      defaultBenchmarkConfiguration.workflows,
    );
    expect(mockBulkCreateAndPublishFlows).toHaveBeenCalledWith(
      expect.any(Array),
      createBenchmarkMockConnections,
      projectId,
      folder.id,
    );
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

  const workflowPaths = [
    { id: 'orch', filePath: '/path/orch.json' },
    { id: 'sub', filePath: '/path/sub.json' },
  ];
  const seedParams = {
    provider: 'aws',
    workflowIds: ['orch', 'sub'],
    connectionId: 'conn-1',
    projectId: 'project-1',
    folderId: 'folder-1',
  };

  const mockConnections = [
    {
      id: 'conn-1',
      name: 'Test connection',
      authProviderKey: 'aws',
      supportedBlocks: [],
    },
  ];

  const setupSeedMocks = (): void => {
    mockResolveWorkflowPathsForSeed.mockReturnValue(workflowPaths);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        template: {
          displayName: 'Test',
          trigger: { type: 'WEBHOOK', name: 'trigger' },
        },
      }),
    );
    mockGetConnectionsWithBlockSupport.mockResolvedValue(mockConnections);
    mockBulkCreateAndPublishFlows.mockResolvedValue([
      { id: 'f1', version: { id: 'v1', displayName: 'Orchestrator' } },
      { id: 'f2', version: { id: 'v2', displayName: 'Sub' } },
    ]);
  };

  it('reads paths, calls bulkCreateAndPublishFlows, returns BenchmarkWorkflowBase[]', async () => {
    setupSeedMocks();
    const result = await createBenchmarkWorkflows(seedParams);

    expect(mockResolveWorkflowPathsForSeed).toHaveBeenCalledWith(
      seedParams.provider,
      seedParams.workflowIds,
    );
    expect(mockGetConnectionsWithBlockSupport).toHaveBeenCalledWith(
      seedParams.projectId,
      [seedParams.connectionId],
    );
    expect(mockReadFile).toHaveBeenCalledTimes(2);
    expect(mockReadFile).toHaveBeenNthCalledWith(1, '/path/orch.json', 'utf-8');
    expect(mockReadFile).toHaveBeenNthCalledWith(2, '/path/sub.json', 'utf-8');
    expect(mockBulkCreateAndPublishFlows).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ template: expect.any(Object) }),
      ]),
      mockConnections,
      seedParams.projectId,
      seedParams.folderId,
    );
    expect(result).toEqual([
      { flowId: 'f1', displayName: 'Orchestrator', isOrchestrator: true },
      { flowId: 'f2', displayName: 'Sub', isOrchestrator: false },
    ]);
  });

  it('returns empty array when workflowIds is empty', async () => {
    setupSeedMocks();
    mockResolveWorkflowPathsForSeed.mockReturnValue([]);
    const result = await createBenchmarkWorkflows({
      ...seedParams,
      workflowIds: [],
    });

    expect(result).toEqual([]);
    expect(mockGetConnectionsWithBlockSupport).not.toHaveBeenCalled();
    expect(mockReadFile).not.toHaveBeenCalled();
    expect(mockBulkCreateAndPublishFlows).not.toHaveBeenCalled();
  });
});
