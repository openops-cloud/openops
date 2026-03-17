import { INTERNAL_ERROR_TOAST, toast } from '@openops/components/ui';
import {
  BenchmarkCreationResult,
  BenchmarkStatus,
  BenchmarkStatusResponse,
} from '@openops/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';

import { benchmarkApi } from '../benchmark-api';
import { useBenchmarkRun } from '../use-benchmark-run';

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
}));

jest.mock('../benchmark-api', () => ({
  benchmarkApi: {
    runBenchmark: jest.fn(),
    getBenchmarkStatus: jest.fn(),
  },
}));

jest.mock('@openops/components/ui', () => ({
  toast: jest.fn(),
  INTERNAL_ERROR_TOAST: { title: 'Error', description: 'Internal error' },
}));

const mockUseMutation = useMutation as jest.Mock;
const mockUseQuery = useQuery as jest.Mock;
const mockRunBenchmark = benchmarkApi.runBenchmark as jest.Mock;
const mockToast = toast as jest.Mock;

const buildBenchmarkCreationResult = (
  overrides?: Partial<BenchmarkCreationResult>,
): BenchmarkCreationResult => ({
  benchmarkId: 'bm-1',
  folderId: 'folder-1',
  provider: 'aws',
  workflows: [
    {
      flowId: 'orch-flow-1',
      displayName: 'Orchestrator',
      isOrchestrator: true,
      isCleanup: false,
    },
    {
      flowId: 'sub-flow-1',
      displayName: 'Sub Workflow',
      isOrchestrator: false,
      isCleanup: false,
    },
  ],
  webhookPayload: {
    webhookBaseUrl: 'http://localhost:4200/api/v1/webhooks',
    workflows: ['sub-flow-1'],
    cleanupWorkflows: ['cleanup-flow-1'],
    accounts: [],
    regions: ['us-east-1'],
  },
  ...overrides,
});

const buildStatusResponse = (
  overrides?: Partial<BenchmarkStatusResponse>,
): BenchmarkStatusResponse => ({
  benchmarkId: 'bm-1',
  status: BenchmarkStatus.RUNNING,
  workflows: [
    {
      flowId: 'orch-flow-1',
      displayName: 'Orchestrator',
      isOrchestrator: true,
      isCleanup: false,
      runStatus: BenchmarkStatus.RUNNING,
      runId: 'run-1',
    },
  ],
  lastRunId: 'run-1',
  ...overrides,
});

const setupMutationMock = (isPending = false) => {
  mockUseMutation.mockImplementation(({ mutationFn, onSuccess, onError }) => ({
    mutateAsync: async (args: unknown) => {
      try {
        const result = await mutationFn(args);
        onSuccess?.(result);
        return result;
      } catch (error) {
        onError(error);
        throw error;
      }
    },
    isPending,
  }));
};

const setupQueryMock = (
  data: BenchmarkStatusResponse | undefined = undefined,
) => {
  mockUseQuery.mockImplementation(({ enabled }: { enabled: boolean }) => ({
    data: enabled ? data : undefined,
  }));
};

describe('useBenchmarkRun', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMutationMock();
    setupQueryMock();
  });

  describe('initial state', () => {
    it('should start with idle runPhase', () => {
      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      expect(result.current.runPhase).toBe('idle');
    });

    it('should start with undefined lastRunId', () => {
      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      expect(result.current.lastRunId).toBeUndefined();
    });

    it('should start with isRunPending false', () => {
      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      expect(result.current.isRunPending).toBe(false);
    });

    it('should start with empty failedWorkflowNames', () => {
      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      expect(result.current.failedWorkflowNames).toEqual([]);
    });
  });

  describe('handleRunBenchmark', () => {
    it('should call runBenchmark with orchestrator flowId and webhook payload', async () => {
      const benchmarkResult = buildBenchmarkCreationResult();
      mockRunBenchmark.mockResolvedValue(undefined);

      const { result } = renderHook(() => useBenchmarkRun(benchmarkResult));

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(mockRunBenchmark).toHaveBeenCalledWith(
        'orch-flow-1',
        benchmarkResult.webhookPayload,
      );
    });

    it('should set runPhase to running after successful run trigger', async () => {
      mockRunBenchmark.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(result.current.runPhase).toBe('running');
    });

    it('should do nothing when benchmarkCreateResult is null', async () => {
      const { result } = renderHook(() => useBenchmarkRun(null));

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(mockRunBenchmark).not.toHaveBeenCalled();
      expect(result.current.runPhase).toBe('idle');
    });

    it('should do nothing when no orchestrator workflow exists', async () => {
      const benchmarkResult = buildBenchmarkCreationResult({
        workflows: [
          {
            flowId: 'sub-flow-1',
            displayName: 'Sub Workflow',
            isOrchestrator: false,
            isCleanup: false,
          },
        ],
      });

      const { result } = renderHook(() => useBenchmarkRun(benchmarkResult));

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(mockRunBenchmark).not.toHaveBeenCalled();
      expect(result.current.runPhase).toBe('idle');
    });

    it('should show error toast and stay idle when run trigger fails', async () => {
      mockRunBenchmark.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      await act(async () => {
        await result.current.handleRunBenchmark().catch(() => undefined);
      });

      expect(mockToast).toHaveBeenCalledWith(INTERNAL_ERROR_TOAST);
      expect(result.current.runPhase).toBe('idle');
    });
  });

  describe('status polling', () => {
    it('should transition to succeeded when status is SUCCEEDED with no failed sub-workflows', async () => {
      mockRunBenchmark.mockResolvedValue(undefined);
      setupQueryMock(
        buildStatusResponse({
          status: BenchmarkStatus.SUCCEEDED,
          workflows: [
            {
              flowId: 'orch-flow-1',
              displayName: 'Orchestrator',
              isOrchestrator: true,
              isCleanup: false,
              runStatus: BenchmarkStatus.SUCCEEDED,
              runId: 'run-1',
            },
            {
              flowId: 'sub-flow-1',
              displayName: 'Sub',
              isOrchestrator: false,
              isCleanup: false,
              runStatus: BenchmarkStatus.SUCCEEDED,
              runId: 'run-2',
            },
          ],
          lastRunId: 'run-1',
        }),
      );

      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(result.current.runPhase).toBe('succeeded');
      expect(result.current.failedWorkflowNames).toEqual([]);
    });

    it('should transition to succeeded_with_failures when some sub-workflows failed', async () => {
      mockRunBenchmark.mockResolvedValue(undefined);
      setupQueryMock(
        buildStatusResponse({
          status: BenchmarkStatus.SUCCEEDED,
          workflows: [
            {
              flowId: 'orch-flow-1',
              displayName: 'Orchestrator',
              isOrchestrator: true,
              isCleanup: false,
              runStatus: BenchmarkStatus.SUCCEEDED,
              runId: 'run-1',
            },
            {
              flowId: 'sub-flow-1',
              displayName: 'Sub',
              isOrchestrator: false,
              isCleanup: false,
              runStatus: BenchmarkStatus.FAILED,
              runId: 'run-2',
            },
          ],
          lastRunId: 'run-1',
        }),
      );

      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(result.current.runPhase).toBe('succeeded_with_failures');
      expect(result.current.failedWorkflowNames).toEqual(['Sub']);
    });

    it('should transition to failed when status is FAILED', async () => {
      mockRunBenchmark.mockResolvedValue(undefined);
      setupQueryMock(
        buildStatusResponse({
          status: BenchmarkStatus.FAILED,
          lastRunId: 'run-1',
        }),
      );

      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(result.current.runPhase).toBe('failed');
    });

    it('should not update runPhase when status is CREATED', async () => {
      mockRunBenchmark.mockResolvedValue(undefined);
      setupQueryMock(
        buildStatusResponse({
          status: BenchmarkStatus.CREATED,
          lastRunId: undefined,
        }),
      );

      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(result.current.runPhase).toBe('running');
    });

    it('should update lastRunId from status response', async () => {
      mockRunBenchmark.mockResolvedValue(undefined);
      setupQueryMock(
        buildStatusResponse({
          status: BenchmarkStatus.SUCCEEDED,
          lastRunId: 'run-42',
        }),
      );

      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(result.current.lastRunId).toBe('run-42');
    });
  });

  describe('handleResetRun', () => {
    it('should reset runPhase to idle and clear lastRunId', async () => {
      mockRunBenchmark.mockResolvedValue(undefined);
      setupQueryMock(
        buildStatusResponse({
          status: BenchmarkStatus.FAILED,
          lastRunId: 'run-1',
        }),
      );

      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(result.current.runPhase).toBe('failed');

      act(() => {
        result.current.handleResetRun();
      });

      expect(result.current.runPhase).toBe('idle');
      expect(result.current.lastRunId).toBeUndefined();
    });
  });

  describe('runningProgress', () => {
    it('should be null in initial idle state', () => {
      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      expect(result.current.runningProgress).toBeNull();
    });

    it('should be null when running but no status data yet', async () => {
      mockRunBenchmark.mockResolvedValue(undefined);
      setupQueryMock(undefined);

      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(result.current.runPhase).toBe('running');
      expect(result.current.runningProgress).toBeNull();
    });

    it('should return 0/n when all sub-workflows are still running', async () => {
      mockRunBenchmark.mockResolvedValue(undefined);
      setupQueryMock(
        buildStatusResponse({
          workflows: [
            {
              flowId: 'orch-flow-1',
              displayName: 'Orchestrator',
              isOrchestrator: true,
              isCleanup: false,
              runStatus: BenchmarkStatus.RUNNING,
              runId: 'run-1',
            },
            {
              flowId: 'sub-flow-1',
              displayName: 'Sub 1',
              isOrchestrator: false,
              isCleanup: false,
              runStatus: BenchmarkStatus.RUNNING,
              runId: 'run-2',
            },
            {
              flowId: 'sub-flow-2',
              displayName: 'Sub 2',
              isOrchestrator: false,
              isCleanup: false,
              runStatus: BenchmarkStatus.RUNNING,
              runId: 'run-3',
            },
          ],
        }),
      );

      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(result.current.runningProgress).toEqual({
        completed: 0,
        total: 2,
      });
    });

    it('should count SUCCEEDED and FAILED sub-workflows as completed', async () => {
      mockRunBenchmark.mockResolvedValue(undefined);
      setupQueryMock(
        buildStatusResponse({
          workflows: [
            {
              flowId: 'orch-flow-1',
              displayName: 'Orchestrator',
              isOrchestrator: true,
              isCleanup: false,
              runStatus: BenchmarkStatus.RUNNING,
              runId: 'run-1',
            },
            {
              flowId: 'sub-flow-1',
              displayName: 'Sub 1',
              isOrchestrator: false,
              isCleanup: false,
              runStatus: BenchmarkStatus.SUCCEEDED,
              runId: 'run-2',
            },
            {
              flowId: 'sub-flow-2',
              displayName: 'Sub 2',
              isOrchestrator: false,
              isCleanup: false,
              runStatus: BenchmarkStatus.FAILED,
              runId: 'run-3',
            },
            {
              flowId: 'sub-flow-3',
              displayName: 'Sub 3',
              isOrchestrator: false,
              isCleanup: false,
              runStatus: BenchmarkStatus.RUNNING,
              runId: 'run-4',
            },
          ],
        }),
      );

      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(result.current.runningProgress).toEqual({
        completed: 2,
        total: 3,
      });
    });

    it('should exclude orchestrator from total and completed counts', async () => {
      mockRunBenchmark.mockResolvedValue(undefined);
      setupQueryMock(
        buildStatusResponse({
          workflows: [
            {
              flowId: 'orch-flow-1',
              displayName: 'Orchestrator',
              isOrchestrator: true,
              isCleanup: false,
              runStatus: BenchmarkStatus.SUCCEEDED,
              runId: 'run-1',
            },
            {
              flowId: 'sub-flow-1',
              displayName: 'Sub 1',
              isOrchestrator: false,
              isCleanup: false,
              runStatus: BenchmarkStatus.RUNNING,
              runId: 'run-2',
            },
          ],
        }),
      );

      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(result.current.runningProgress).toEqual({
        completed: 0,
        total: 1,
      });
    });

    it('should return null after handleResetRun', async () => {
      mockRunBenchmark.mockResolvedValue(undefined);
      setupQueryMock(
        buildStatusResponse({
          workflows: [
            {
              flowId: 'orch-flow-1',
              displayName: 'Orchestrator',
              isOrchestrator: true,
              isCleanup: false,
              runStatus: BenchmarkStatus.RUNNING,
              runId: 'run-1',
            },
            {
              flowId: 'sub-flow-1',
              displayName: 'Sub 1',
              isOrchestrator: false,
              isCleanup: false,
              runStatus: BenchmarkStatus.RUNNING,
              runId: 'run-2',
            },
          ],
        }),
      );

      const { result } = renderHook(() =>
        useBenchmarkRun(buildBenchmarkCreationResult()),
      );

      await act(async () => {
        await result.current.handleRunBenchmark();
      });

      expect(result.current.runningProgress).not.toBeNull();

      act(() => {
        result.current.handleResetRun();
      });

      expect(result.current.runningProgress).toBeNull();
    });
  });
});
