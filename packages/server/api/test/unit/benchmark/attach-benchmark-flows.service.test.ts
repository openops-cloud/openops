import { BenchmarkProviders } from '@openops/shared';
import {
  attachFlowsToBenchmark,
  type AttachFlowsToBenchmarkRequest,
} from '../../../src/app/benchmark/attach-benchmark-flows.service';

const mockBenchmarkRepoSave = jest.fn();
const mockBenchmarkRepo = {
  update: jest.fn(),
  save: mockBenchmarkRepoSave,
};

const mockBenchmarkFlowRepoSave = jest.fn();
const mockBenchmarkFlowRepo = {
  update: jest.fn(),
  save: mockBenchmarkFlowRepoSave,
};

jest.mock('../../../src/app/benchmark/benchmark.repo', () => ({
  benchmarkRepo: (): typeof mockBenchmarkRepo => mockBenchmarkRepo,
}));

jest.mock('../../../src/app/benchmark/benchmark-flow.repo', () => ({
  benchmarkFlowRepo: (): typeof mockBenchmarkFlowRepo => mockBenchmarkFlowRepo,
}));

jest.mock('../../../src/app/core/db/transaction', () => ({
  transaction: async <T>(operation: (em: unknown) => Promise<T>): Promise<T> =>
    operation({}),
}));

const mockGetWebhookPrefix = jest.fn();
jest.mock('server-worker', () => ({
  webhookUtils: {
    getWebhookPrefix: (
      ...args: unknown[]
    ): ReturnType<typeof mockGetWebhookPrefix> => mockGetWebhookPrefix(...args),
  },
}));

const defaultWebhookBaseUrl = 'https://api.example.com/v1/webhooks';

describe('create-benchmark-flows.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWebhookPrefix.mockResolvedValue(defaultWebhookBaseUrl);
  });

  const attachFlowsToBenchmarkRequest: AttachFlowsToBenchmarkRequest = {
    projectId: 'project-1',
    provider: BenchmarkProviders.AWS,
    folderId: 'folder-1',
    connectionId: 'conn-1',
    benchmarkConfiguration: {
      connection: ['conn-1'],
      workflows: ['w1'],
      accounts: [] as string[],
      regions: ['us-east-1'],
    },
    workflows: [
      {
        flowId: 'flow-orchestrator',
        displayName: 'Orchestrator',
        isOrchestrator: true,
      },
      {
        flowId: 'flow-cleanup',
        displayName: 'Cleanup',
        isOrchestrator: false,
      },
      { flowId: 'flow-sub', displayName: 'Sub', isOrchestrator: false },
    ],
  };

  it('attachFlowsToBenchmark builds payload, saves benchmark and benchmark_flow rows, returns benchmark and payload', async () => {
    mockBenchmarkRepoSave.mockImplementation((row: Record<string, unknown>) =>
      Promise.resolve({
        ...row,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }),
    );
    mockBenchmarkFlowRepoSave.mockResolvedValue(undefined);

    const result = await attachFlowsToBenchmark(attachFlowsToBenchmarkRequest);

    expect(mockGetWebhookPrefix).toHaveBeenCalled();
    expect(mockBenchmarkRepoSave).toHaveBeenCalledTimes(1);
    const savedBenchmarkArg = mockBenchmarkRepoSave.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(savedBenchmarkArg.projectId).toBe(
      attachFlowsToBenchmarkRequest.projectId,
    );
    expect(savedBenchmarkArg.provider).toBe(
      attachFlowsToBenchmarkRequest.provider,
    );
    expect(savedBenchmarkArg.folderId).toBe(
      attachFlowsToBenchmarkRequest.folderId,
    );
    expect(savedBenchmarkArg.connectionId).toBe(
      attachFlowsToBenchmarkRequest.connectionId,
    );
    expect(savedBenchmarkArg.payload).toEqual(
      expect.objectContaining({
        webhookBaseUrl: defaultWebhookBaseUrl,
        workflows: ['flow-sub'],
        cleanupWorkflows: ['flow-cleanup'],
        accounts: [],
        regions: ['us-east-1'],
      }),
    );
    expect(savedBenchmarkArg.deletedAt).toBeNull();

    expect(mockBenchmarkFlowRepoSave).toHaveBeenCalledTimes(1);
    const savedFlowRows = mockBenchmarkFlowRepoSave.mock.calls[0][0] as Array<
      Record<string, unknown>
    >;
    expect(savedFlowRows).toHaveLength(3);
    expect(savedFlowRows[0].flowId).toBe('flow-orchestrator');
    expect(savedFlowRows[0].isOrchestrator).toBe(true);
    expect(savedFlowRows[1].flowId).toBe('flow-cleanup');
    expect(savedFlowRows[1].isOrchestrator).toBe(false);
    expect(savedFlowRows[2].flowId).toBe('flow-sub');
    expect(savedFlowRows[2].isOrchestrator).toBe(false);
    savedFlowRows.forEach((row) => {
      expect(row.benchmarkId).toBe(result.benchmark.id);
      expect(row.deletedAt).toBeNull();
    });

    expect(result.benchmark.id).toBeDefined();
    expect(result.payload.webhookBaseUrl).toBe(defaultWebhookBaseUrl);
    expect(result.payload.workflows).toEqual(['flow-sub']);
    expect(result.payload.cleanupWorkflows).toEqual(['flow-cleanup']);
    expect(result.payload.accounts).toEqual([]);
    expect(result.payload.regions).toEqual(['us-east-1']);
  });

  it('attachFlowsToBenchmark throws when workflows has fewer than 3 items', async () => {
    await expect(
      attachFlowsToBenchmark({
        ...attachFlowsToBenchmarkRequest,
        workflows: [
          {
            flowId: 'f1',
            displayName: 'Orchestrator',
            isOrchestrator: true,
          },
        ],
      }),
    ).rejects.toThrow(
      'Benchmark requires orchestrator, cleanup, and at least one sub-workflow',
    );
    expect(mockBenchmarkRepoSave).not.toHaveBeenCalled();
    expect(mockBenchmarkFlowRepoSave).not.toHaveBeenCalled();
  });
});
