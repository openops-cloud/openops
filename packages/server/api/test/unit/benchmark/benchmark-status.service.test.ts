import {
  BenchmarkProviders,
  BenchmarkStatus,
  ErrorCode,
  FlowRunStatus,
} from '@openops/shared';
import {
  getBenchmarkStatus,
  listBenchmarks,
} from '../../../src/app/benchmark/benchmark-status.service';

const mockFindOneBenchmark = jest.fn();
const mockFindBenchmarks = jest.fn();
const mockBenchmarkRepo = {
  findOne: mockFindOneBenchmark,
  find: mockFindBenchmarks,
};

const mockGetRawManyFlows = jest.fn();
const mockBenchmarkFlowRepo = {
  createQueryBuilder: jest.fn().mockReturnValue({
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: mockGetRawManyFlows,
  }),
};

const mockGetRawManyRuns = jest.fn();
const mockFlowRunRepo = {
  createQueryBuilder: jest.fn().mockReturnValue({
    distinctOn: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: mockGetRawManyRuns,
  }),
};

jest.mock('../../../src/app/benchmark/benchmark.repo', () => ({
  benchmarkRepo: (): typeof mockBenchmarkRepo => mockBenchmarkRepo,
}));

jest.mock('../../../src/app/benchmark/benchmark-flow.repo', () => ({
  benchmarkFlowRepo: (): typeof mockBenchmarkFlowRepo => mockBenchmarkFlowRepo,
}));

jest.mock('../../../src/app/flows/flow-run/flow-run-service', () => ({
  flowRunRepo: (): typeof mockFlowRunRepo => mockFlowRunRepo,
}));

const BENCHMARK_ID = 'benchmark-001';
const PROJECT_ID = 'project-001';

const baseBenchmark = {
  id: BENCHMARK_ID,
  projectId: PROJECT_ID,
  provider: 'aws',
  deletedAt: null,
};

const flowRows = [
  {
    flowId: 'flow-orch',
    isOrchestrator: true,
    isCleanup: false,
    displayName: 'Orchestrator',
  },
  {
    flowId: 'flow-sub1',
    isOrchestrator: false,
    isCleanup: false,
    displayName: 'Sub Workflow 1',
  },
];

describe('getBenchmarkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBenchmarkFlowRepo.createQueryBuilder.mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: mockGetRawManyFlows,
    });
    mockFlowRunRepo.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      distinctOn: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawMany: mockGetRawManyRuns,
    });
    mockGetRawManyRuns.mockResolvedValue([]);
  });

  it('throws ENTITY_NOT_FOUND when benchmark does not exist', async () => {
    mockFindOneBenchmark.mockResolvedValue(null);
    mockGetRawManyFlows.mockResolvedValue([]);

    await expect(
      getBenchmarkStatus({ benchmarkId: BENCHMARK_ID, projectId: PROJECT_ID }),
    ).rejects.toMatchObject({
      error: {
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: { entityType: 'Benchmark', entityId: BENCHMARK_ID },
      },
    });
  });

  it('returns IDLE status when orchestrator has no run', async () => {
    mockFindOneBenchmark.mockResolvedValue(baseBenchmark);
    mockGetRawManyFlows.mockResolvedValue(flowRows);

    const result = await getBenchmarkStatus({
      benchmarkId: BENCHMARK_ID,
      projectId: PROJECT_ID,
    });

    expect(result.status).toBe(BenchmarkStatus.CREATED);
    expect(result.lastRunId).toBeUndefined();
    expect(result.lastRunFinishedAt).toBeUndefined();
  });

  it('returns RUNNING status when orchestrator run is RUNNING', async () => {
    mockFindOneBenchmark.mockResolvedValue(baseBenchmark);
    mockGetRawManyFlows.mockResolvedValue(flowRows);
    mockGetRawManyRuns.mockResolvedValue([
      {
        id: 'run-001',
        flowId: 'flow-orch',
        status: FlowRunStatus.RUNNING,
        finishTime: undefined,
      },
    ]);

    const result = await getBenchmarkStatus({
      benchmarkId: BENCHMARK_ID,
      projectId: PROJECT_ID,
    });

    expect(result.status).toBe(BenchmarkStatus.RUNNING);
    expect(result.lastRunId).toBe('run-001');
    expect(result.lastRunFinishedAt).toBeUndefined();
  });

  it('returns SUCCEEDED status when orchestrator run is SUCCEEDED', async () => {
    mockFindOneBenchmark.mockResolvedValue(baseBenchmark);
    mockGetRawManyFlows.mockResolvedValue(flowRows);
    mockGetRawManyRuns.mockResolvedValue([
      {
        id: 'run-002',
        flowId: 'flow-orch',
        status: FlowRunStatus.SUCCEEDED,
        finishTime: '2024-01-01T12:00:00.000Z',
      },
    ]);

    const result = await getBenchmarkStatus({
      benchmarkId: BENCHMARK_ID,
      projectId: PROJECT_ID,
    });

    expect(result.status).toBe(BenchmarkStatus.SUCCEEDED);
    expect(result.lastRunId).toBe('run-002');
    expect(result.lastRunFinishedAt).toBe('2024-01-01T12:00:00.000Z');
  });

  it('returns FAILED status when orchestrator run is FAILED', async () => {
    mockFindOneBenchmark.mockResolvedValue(baseBenchmark);
    mockGetRawManyFlows.mockResolvedValue(flowRows);
    mockGetRawManyRuns.mockResolvedValue([
      {
        id: 'run-003',
        flowId: 'flow-orch',
        status: FlowRunStatus.FAILED,
        finishTime: '2024-01-02T08:00:00.000Z',
      },
    ]);

    const result = await getBenchmarkStatus({
      benchmarkId: BENCHMARK_ID,
      projectId: PROJECT_ID,
    });

    expect(result.status).toBe(BenchmarkStatus.FAILED);
  });

  it('sets runStatus to IDLE for workflows with no run found', async () => {
    mockFindOneBenchmark.mockResolvedValue(baseBenchmark);
    mockGetRawManyFlows.mockResolvedValue(flowRows);
    mockGetRawManyRuns.mockResolvedValue([]);

    const result = await getBenchmarkStatus({
      benchmarkId: BENCHMARK_ID,
      projectId: PROJECT_ID,
    });

    expect(result.workflows).toHaveLength(2);
    result.workflows.forEach((wf) => {
      expect(wf.runStatus).toBe(BenchmarkStatus.CREATED);
      expect(wf.runId).toBeUndefined();
    });
  });

  it('includes runId and runStatus from latest flow run per workflow', async () => {
    mockFindOneBenchmark.mockResolvedValue(baseBenchmark);
    mockGetRawManyFlows.mockResolvedValue(flowRows);
    mockGetRawManyRuns.mockResolvedValue([
      { id: 'fr-orch', flowId: 'flow-orch', status: FlowRunStatus.SUCCEEDED },
      { id: 'fr-sub1', flowId: 'flow-sub1', status: FlowRunStatus.RUNNING },
    ]);

    const result = await getBenchmarkStatus({
      benchmarkId: BENCHMARK_ID,
      projectId: PROJECT_ID,
    });

    const orchestratorWf = result.workflows.find((w) => w.isOrchestrator);
    const subWf = result.workflows.find((w) => !w.isOrchestrator);

    expect(orchestratorWf?.runId).toBe('fr-orch');
    expect(orchestratorWf?.runStatus).toBe(BenchmarkStatus.SUCCEEDED);
    expect(subWf?.runId).toBe('fr-sub1');
    expect(subWf?.runStatus).toBe(BenchmarkStatus.RUNNING);
  });

  it('uses the single run returned by distinctOn per flowId', async () => {
    mockFindOneBenchmark.mockResolvedValue(baseBenchmark);
    mockGetRawManyFlows.mockResolvedValue([
      {
        flowId: 'flow-orch',
        isOrchestrator: true,
        isCleanup: false,
        displayName: 'Orchestrator',
      },
    ]);

    mockGetRawManyRuns.mockResolvedValue([
      {
        id: 'run-newer-id',
        flowId: 'flow-orch',
        status: FlowRunStatus.SUCCEEDED,
      },
    ]);

    const result = await getBenchmarkStatus({
      benchmarkId: BENCHMARK_ID,
      projectId: PROJECT_ID,
    });

    expect(result.workflows).toHaveLength(1);
    expect(result.workflows[0].runId).toBe('run-newer-id');
    expect(result.workflows[0].runStatus).toBe(BenchmarkStatus.SUCCEEDED);
  });

  it('maps displayName from publishedVersion (falling back to empty string when null)', async () => {
    mockFindOneBenchmark.mockResolvedValue(baseBenchmark);
    mockGetRawManyFlows.mockResolvedValue([
      {
        flowId: 'flow-a',
        isOrchestrator: false,
        isCleanup: false,
        displayName: null,
      },
    ]);

    const result = await getBenchmarkStatus({
      benchmarkId: BENCHMARK_ID,
      projectId: PROJECT_ID,
    });

    expect(result.workflows[0].displayName).toBe('');
  });

  describe('mapFlowRunStatusToBenchmarkStatus (via overall status)', () => {
    const withOrchestratorRun = (status: FlowRunStatus) => {
      mockFindOneBenchmark.mockResolvedValue(baseBenchmark);
      mockGetRawManyFlows.mockResolvedValue([
        {
          flowId: 'flow-orch',
          isOrchestrator: true,
          isCleanup: false,
          displayName: 'Orchestrator',
        },
      ]);
      mockGetRawManyRuns.mockResolvedValue([
        { id: 'run-x', flowId: 'flow-orch', status, finishTime: undefined },
      ]);
      return getBenchmarkStatus({
        benchmarkId: BENCHMARK_ID,
        projectId: PROJECT_ID,
      });
    };

    it('maps PAUSED → RUNNING', async () => {
      const result = await withOrchestratorRun(FlowRunStatus.PAUSED);
      expect(result.status).toBe(BenchmarkStatus.RUNNING);
    });

    it('maps SCHEDULED → RUNNING', async () => {
      const result = await withOrchestratorRun(FlowRunStatus.SCHEDULED);
      expect(result.status).toBe(BenchmarkStatus.RUNNING);
    });

    it('maps TIMEOUT → FAILED', async () => {
      const result = await withOrchestratorRun(FlowRunStatus.TIMEOUT);
      expect(result.status).toBe(BenchmarkStatus.FAILED);
    });

    it('maps INTERNAL_ERROR → FAILED', async () => {
      const result = await withOrchestratorRun(FlowRunStatus.INTERNAL_ERROR);
      expect(result.status).toBe(BenchmarkStatus.FAILED);
    });

    it('maps IGNORED → FAILED', async () => {
      const result = await withOrchestratorRun(FlowRunStatus.IGNORED);
      expect(result.status).toBe(BenchmarkStatus.FAILED);
    });

    it('maps STOPPED → SUCCEEDED', async () => {
      const result = await withOrchestratorRun(FlowRunStatus.STOPPED);
      expect(result.status).toBe(BenchmarkStatus.SUCCEEDED);
    });
  });
});

describe('listBenchmarks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBenchmarkFlowRepo.createQueryBuilder.mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: mockGetRawManyFlows,
    });
    mockFlowRunRepo.createQueryBuilder.mockReturnValue({
      distinctOn: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawMany: mockGetRawManyRuns,
    });
    mockGetRawManyRuns.mockResolvedValue([]);
  });

  it('returns empty array when no benchmarks exist', async () => {
    mockFindBenchmarks.mockResolvedValue([]);

    const result = await listBenchmarks({ projectId: PROJECT_ID });

    expect(result).toEqual([]);
    expect(mockBenchmarkFlowRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns CREATED status when benchmark has no runs', async () => {
    mockFindBenchmarks.mockResolvedValue([baseBenchmark]);
    mockGetRawManyFlows.mockResolvedValue([
      {
        benchmarkId: BENCHMARK_ID,
        flowId: 'flow-orch',
        isOrchestrator: true,
        isCleanup: false,
        displayName: 'Orchestrator',
      },
    ]);

    const result = await listBenchmarks({ projectId: PROJECT_ID });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      benchmarkId: BENCHMARK_ID,
      provider: 'aws',
      status: BenchmarkStatus.CREATED,
    });
  });

  it('returns RUNNING status when orchestrator run is RUNNING', async () => {
    mockFindBenchmarks.mockResolvedValue([baseBenchmark]);
    mockGetRawManyFlows.mockResolvedValue([
      {
        benchmarkId: BENCHMARK_ID,
        flowId: 'flow-orch',
        isOrchestrator: true,
        isCleanup: false,
        displayName: 'Orchestrator',
      },
    ]);
    mockGetRawManyRuns.mockResolvedValue([
      { id: 'run-001', flowId: 'flow-orch', status: FlowRunStatus.RUNNING },
    ]);

    const result = await listBenchmarks({ projectId: PROJECT_ID });

    expect(result[0].status).toBe(BenchmarkStatus.RUNNING);
  });

  it('returns SUCCEEDED status when orchestrator run is SUCCEEDED', async () => {
    mockFindBenchmarks.mockResolvedValue([baseBenchmark]);
    mockGetRawManyFlows.mockResolvedValue([
      {
        benchmarkId: BENCHMARK_ID,
        flowId: 'flow-orch',
        isOrchestrator: true,
        isCleanup: false,
        displayName: 'Orchestrator',
      },
    ]);
    mockGetRawManyRuns.mockResolvedValue([
      { id: 'run-002', flowId: 'flow-orch', status: FlowRunStatus.SUCCEEDED },
    ]);

    const result = await listBenchmarks({ projectId: PROJECT_ID });

    expect(result[0].status).toBe(BenchmarkStatus.SUCCEEDED);
  });

  it('returns FAILED status when orchestrator run is FAILED', async () => {
    mockFindBenchmarks.mockResolvedValue([baseBenchmark]);
    mockGetRawManyFlows.mockResolvedValue([
      {
        benchmarkId: BENCHMARK_ID,
        flowId: 'flow-orch',
        isOrchestrator: true,
        isCleanup: false,
        displayName: 'Orchestrator',
      },
    ]);
    mockGetRawManyRuns.mockResolvedValue([
      { id: 'run-003', flowId: 'flow-orch', status: FlowRunStatus.FAILED },
    ]);

    const result = await listBenchmarks({ projectId: PROJECT_ID });

    expect(result[0].status).toBe(BenchmarkStatus.FAILED);
  });

  it('passes provider to find when provider filter is supplied', async () => {
    mockFindBenchmarks.mockResolvedValue([]);

    await listBenchmarks({
      projectId: PROJECT_ID,
      provider: BenchmarkProviders.AWS,
    });

    expect(mockFindBenchmarks).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ provider: BenchmarkProviders.AWS }),
      }),
    );
  });

  it('omits provider from find when no provider filter is supplied', async () => {
    mockFindBenchmarks.mockResolvedValue([]);

    await listBenchmarks({ projectId: PROJECT_ID });

    expect(mockFindBenchmarks).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ provider: expect.anything() }),
      }),
    );
  });

  it('derives status from orchestrator run when sub-workflow rows are also present', async () => {
    mockFindBenchmarks.mockResolvedValue([baseBenchmark]);
    mockGetRawManyFlows.mockResolvedValue([
      {
        benchmarkId: BENCHMARK_ID,
        flowId: 'flow-orch',
        isOrchestrator: true,
        isCleanup: false,
        displayName: 'Orchestrator',
      },
      {
        benchmarkId: BENCHMARK_ID,
        flowId: 'flow-sub1',
        isOrchestrator: false,
        isCleanup: false,
        displayName: 'Sub 1',
      },
    ]);
    mockGetRawManyRuns.mockResolvedValue([
      { id: 'run-001', flowId: 'flow-orch', status: FlowRunStatus.SUCCEEDED },
    ]);

    const result = await listBenchmarks({ projectId: PROJECT_ID });

    expect(result[0].status).toBe(BenchmarkStatus.SUCCEEDED);
  });
});
