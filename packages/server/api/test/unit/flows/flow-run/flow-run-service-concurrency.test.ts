import { FlowRunStatus, FlowRetryStrategy, RunEnvironment, ExecutionType, FlowRunId } from '@openops/shared';
import { flowRunService } from '../../../../src/app/flows/flow-run/flow-run-service';
import { flowRunSideEffects } from '../../../../src/app/flows/flow-run/flow-run-side-effects';
import { flowService } from '../../../../src/app/flows/flow/flow.service';
import { flowVersionService } from '../../../../src/app/flows/flow-version/flow-version.service';
import { fileService } from '../../../../src/app/file/file.service';
import { flowStepTestOutputService } from '../../../../src/app/flows/step-test-output/flow-step-test-output.service';

jest.mock('../../../../src/app/flows/flow-run/flow-run-side-effects');
jest.mock('../../../../src/app/flows/flow/flow.service');
jest.mock('../../../../src/app/flows/flow-version/flow-version.service');
jest.mock('../../../../src/app/file/file.service');
jest.mock('../../../../src/app/flows/step-test-output/flow-step-test-output.service');

const mockFlowRunSideEffects = flowRunSideEffects as jest.Mocked<typeof flowRunSideEffects>;
const mockFlowService = flowService as jest.Mocked<typeof flowService>;
const mockFlowVersionService = flowVersionService as jest.Mocked<typeof flowVersionService>;
const mockFileService = fileService as jest.Mocked<typeof fileService>;
const mockFlowStepTestOutputService = flowStepTestOutputService as jest.Mocked<typeof flowStepTestOutputService>;

describe('FlowRunService Concurrency Tests', () => {
  const mockFlowVersion = {
    id: 'flow-version-1',
    flowId: 'flow-1',
    trigger: { name: 'webhook-trigger', type: 'WEBHOOK' },
    actions: [],
  };

  const mockFlow = {
    id: 'flow-1',
    projectId: 'project-1',
    displayName: 'Test Flow',
    version: mockFlowVersion,
    publishedVersionId: 'flow-version-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.setTimeout(10000);
  });

  describe('Concurrent Flow Run Creation', () => {
    it('should handle multiple simultaneous start() calls without creating duplicates', async () => {
      mockFlowService.getOnePopulatedOrThrow.mockResolvedValue(mockFlow as any);
      mockFlowRunSideEffects.start.mockResolvedValue('job-1');

      const startParams = {
        projectId: 'project-1',
        flowId: 'flow-1',
        flowVersionId: 'flow-version-1',
        environment: RunEnvironment.PRODUCTION,
        executionType: ExecutionType.BEGIN,
        synchronousHandlerId: undefined,
        executionCorrelationId: 'correlation-1',
        payload: { data: 'test' },
      };

      const promises = Array.from({ length: 5 }, () =>
        flowRunService.start(startParams)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockFlowService.getOnePopulatedOrThrow).toHaveBeenCalledTimes(5);
      expect(mockFlowRunSideEffects.start).toHaveBeenCalledTimes(5);

      const uniqueRunIds = new Set(results.map(r => r.id));
      expect(uniqueRunIds.size).toBe(5);
    });

    it('should handle race condition between flow run save and queue addition', async () => {
      mockFlowService.getOnePopulatedOrThrow.mockResolvedValue(mockFlow as any);
      
      let saveCallCount = 0;
      const originalSave = jest.fn().mockImplementation(() => {
        saveCallCount++;
        if (saveCallCount === 1) {
          return Promise.resolve({ id: 'run-1', status: FlowRunStatus.SCHEDULED });
        }
        throw new Error('Database connection lost');
      });

      mockFlowRunSideEffects.start.mockImplementation(async (params) => {
        if (params.flowRun.id === 'run-1') {
          throw new Error('Queue service unavailable');
        }
        return 'job-1';
      });

      const startParams = {
        projectId: 'project-1',
        flowId: 'flow-1',
        flowVersionId: 'flow-version-1',
        environment: RunEnvironment.PRODUCTION,
        executionType: ExecutionType.BEGIN,
        synchronousHandlerId: undefined,
        executionCorrelationId: 'correlation-1',
        payload: { data: 'test' },
      };

      await expect(flowRunService.start(startParams)).rejects.toThrow('Queue service unavailable');
    });

    it('should handle concurrent creation with same correlation ID', async () => {
      mockFlowService.getOnePopulatedOrThrow.mockResolvedValue(mockFlow as any);
      mockFlowRunSideEffects.start.mockResolvedValue('job-1');

      const startParams = {
        projectId: 'project-1',
        flowId: 'flow-1',
        flowVersionId: 'flow-version-1',
        environment: RunEnvironment.PRODUCTION,
        executionType: ExecutionType.BEGIN,
        synchronousHandlerId: undefined,
        executionCorrelationId: 'same-correlation-id',
        payload: { data: 'test' },
      };

      const promises = Array.from({ length: 3 }, () =>
        flowRunService.start(startParams)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockFlowRunSideEffects.start).toHaveBeenCalledTimes(3);
      
      const correlationIds = results.map(r => 
        mockFlowRunSideEffects.start.mock.calls.find(call => 
          call[0].executionCorrelationId === 'same-correlation-id'
        )
      );
      expect(correlationIds.every(id => id)).toBe(true);
    });
  });

  describe('Concurrent Queue Operations', () => {
    it('should handle multiple addToQueue calls for same flow run', async () => {
      const flowRun = {
        id: 'run-1',
        projectId: 'project-1',
        flowId: 'flow-1',
        flowVersionId: 'flow-version-1',
        status: FlowRunStatus.PAUSED,
        environment: RunEnvironment.PRODUCTION,
      };

      mockFlowRunSideEffects.start.mockResolvedValue('job-1');

      const promises = Array.from({ length: 3 }, (_, i) =>
        flowRunService.addToQueue({
          executionCorrelationId: `correlation-${i}`,
          flowRunId: 'run-1',
          executionType: ExecutionType.RESUME,
          steps: {},
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockFlowRunSideEffects.start).toHaveBeenCalledTimes(3);
      
      const uniqueCorrelationIds = new Set(
        mockFlowRunSideEffects.start.mock.calls.map(call => call[0].executionCorrelationId)
      );
      expect(uniqueCorrelationIds.size).toBe(3);
    });

    it('should handle concurrent retry operations', async () => {
      const flowRunId = 'run-1';
      mockFlowRunSideEffects.start.mockResolvedValue('job-1');

      const retryPromises = Array.from({ length: 4 }, () =>
        flowRunService.retry({
          flowRunId,
          strategy: FlowRetryStrategy.FROM_FAILED_STEP,
        })
      );

      const results = await Promise.all(retryPromises);

      expect(results).toHaveLength(4);
      expect(mockFlowRunSideEffects.start).toHaveBeenCalledTimes(4);
      
      const executionCorrelationIds = mockFlowRunSideEffects.start.mock.calls.map(
        call => call[0].executionCorrelationId
      );
      const uniqueIds = new Set(executionCorrelationIds);
      expect(uniqueIds.size).toBe(4);
    });

    it('should handle queue addition failures during concurrent operations', async () => {
      mockFlowRunSideEffects.start.mockImplementation(async (params) => {
        if (params.executionCorrelationId === 'fail-correlation') {
          throw new Error('Queue full');
        }
        return 'job-1';
      });

      const successPromise = flowRunService.addToQueue({
        executionCorrelationId: 'success-correlation',
        flowRunId: 'run-1',
        executionType: ExecutionType.RESUME,
        steps: {},
      });

      const failPromise = flowRunService.addToQueue({
        executionCorrelationId: 'fail-correlation',
        flowRunId: 'run-1',
        executionType: ExecutionType.RESUME,
        steps: {},
      });

      const results = await Promise.allSettled([successPromise, failPromise]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect((results[1] as PromiseRejectedResult).reason.message).toBe('Queue full');
    });
  });

  describe('Concurrent Status Updates', () => {
    it('should handle multiple updateStatus calls for same flow run', async () => {
      const flowRunId = 'run-1';
      mockFileService.create.mockResolvedValue({ id: 'file-1' } as any);

      const updatePromises = Array.from({ length: 3 }, (_, i) =>
        flowRunService.updateStatus({
          flowRunId,
          status: i === 2 ? FlowRunStatus.SUCCEEDED : FlowRunStatus.RUNNING,
          tasks: i + 1,
          duration: (i + 1) * 1000,
          executionState: { steps: {} },
          projectId: 'project-1',
          tags: [`tag-${i}`],
        })
      );

      const results = await Promise.all(updatePromises);

      expect(results).toHaveLength(3);
      expect(mockFileService.create).toHaveBeenCalledTimes(3);
      
      const finalStatuses = results.map(r => r.status);
      expect(finalStatuses).toContain(FlowRunStatus.SUCCEEDED);
      expect(finalStatuses).toContain(FlowRunStatus.RUNNING);
    });

    it('should handle concurrent status updates with log file creation race', async () => {
      const flowRunId = 'run-1';
      
      let createCallCount = 0;
      mockFileService.create.mockImplementation(async () => {
        createCallCount++;
        if (createCallCount === 2) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return { id: `file-${createCallCount}` };
      });

      const updatePromises = [
        flowRunService.updateStatus({
          flowRunId,
          status: FlowRunStatus.RUNNING,
          tasks: 1,
          duration: 1000,
          executionState: { steps: {} },
          projectId: 'project-1',
          tags: ['tag-1'],
        }),
        flowRunService.updateStatus({
          flowRunId,
          status: FlowRunStatus.SUCCEEDED,
          tasks: 2,
          duration: 2000,
          executionState: { steps: {} },
          projectId: 'project-1',
          tags: ['tag-2'],
        }),
      ];

      const results = await Promise.all(updatePromises);

      expect(results).toHaveLength(2);
      expect(mockFileService.create).toHaveBeenCalledTimes(2);
      expect(results[0].status).toBe(FlowRunStatus.RUNNING);
      expect(results[1].status).toBe(FlowRunStatus.SUCCEEDED);
    });

    it('should handle concurrent updates with different execution states', async () => {
      const flowRunId = 'run-1';
      mockFileService.create.mockResolvedValue({ id: 'file-1' } as any);

      const largeExecutionState = {
        steps: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [`step-${i}`, { output: `result-${i}` }])
        ),
      };

      const updatePromises = [
        flowRunService.updateStatus({
          flowRunId,
          status: FlowRunStatus.RUNNING,
          tasks: 1,
          duration: 1000,
          executionState: largeExecutionState,
          projectId: 'project-1',
          tags: ['large-state'],
        }),
        flowRunService.updateStatus({
          flowRunId,
          status: FlowRunStatus.SUCCEEDED,
          tasks: 2,
          duration: 2000,
          executionState: { steps: {} },
          projectId: 'project-1',
          tags: ['small-state'],
        }),
      ];

      const results = await Promise.all(updatePromises);

      expect(results).toHaveLength(2);
      expect(mockFileService.create).toHaveBeenCalledTimes(2);
      
      const createCalls = mockFileService.create.mock.calls;
      const largeStateCall = createCalls.find(call => 
        call[0].data.toString().includes('step-99')
      );
      const smallStateCall = createCalls.find(call => 
        !call[0].data.toString().includes('step-99')
      );
      
      expect(largeStateCall).toBeDefined();
      expect(smallStateCall).toBeDefined();
    });
  });

  describe('Concurrent Pause/Resume Operations', () => {
    it('should handle concurrent pause and resume operations', async () => {
      const flowRunId = 'run-1';
      mockFlowRunSideEffects.start.mockResolvedValue('job-1');

      const pausePromise = flowRunService.pause({
        flowRunId,
        pauseMetadata: {
          pauseId: 'pause-1',
          progressUpdateType: 'WEBHOOK_RESPONSE',
          handlerId: 'handler-1',
          executionCorrelationId: 'correlation-1',
        },
      });

      const resumePromise = flowRunService.addToQueue({
        executionCorrelationId: 'correlation-2',
        flowRunId,
        executionType: ExecutionType.RESUME,
        steps: {},
      });

      const results = await Promise.allSettled([pausePromise, resumePromise]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(mockFlowRunSideEffects.start).toHaveBeenCalled();
    });

    it('should handle pause with concurrent status updates', async () => {
      const flowRunId = 'run-1';
      mockFileService.create.mockResolvedValue({ id: 'file-1' } as any);

      const pausePromise = flowRunService.pause({
        flowRunId,
        pauseMetadata: {
          pauseId: 'pause-1',
          progressUpdateType: 'WEBHOOK_RESPONSE',
          handlerId: 'handler-1',
          executionCorrelationId: 'correlation-1',
        },
      });

      const updatePromise = flowRunService.updateStatus({
        flowRunId,
        status: FlowRunStatus.SUCCEEDED,
        tasks: 1,
        duration: 1000,
        executionState: { steps: {} },
        projectId: 'project-1',
        tags: ['concurrent-update'],
      });

      const results = await Promise.allSettled([pausePromise, updatePromise]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
    });

    it('should handle multiple pause requests for same flow run', async () => {
      const flowRunId = 'run-1';

      const pausePromises = Array.from({ length: 3 }, (_, i) =>
        flowRunService.pause({
          flowRunId,
          pauseMetadata: {
            pauseId: `pause-${i}`,
            progressUpdateType: 'WEBHOOK_RESPONSE',
            handlerId: `handler-${i}`,
            executionCorrelationId: `correlation-${i}`,
          },
        })
      );

      const results = await Promise.all(pausePromises);

      expect(results).toHaveLength(3);
      expect(mockFlowRunSideEffects.start).toHaveBeenCalledTimes(3);
      
      const delayedJobs = mockFlowRunSideEffects.start.mock.calls.filter(call =>
        call[0].jobType === 'DELAYED'
      );
      expect(delayedJobs).toHaveLength(3);
    });
  });

  describe('Database Transaction Edge Cases', () => {
    it('should handle database connection failures during concurrent operations', async () => {
      const flowRunId = 'run-1';
      mockFileService.create.mockRejectedValue(new Error('Database connection lost'));

      const updatePromises = Array.from({ length: 2 }, (_, i) =>
        flowRunService.updateStatus({
          flowRunId,
          status: FlowRunStatus.RUNNING,
          tasks: i + 1,
          duration: (i + 1) * 1000,
          executionState: { steps: {} },
          projectId: 'project-1',
          tags: [`tag-${i}`],
        })
      );

      const results = await Promise.allSettled(updatePromises);

      expect(results.every(r => r.status === 'rejected')).toBe(true);
      expect(mockFileService.create).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in concurrent operations', async () => {
      const flowRunId = 'run-1';
      
      let createCallCount = 0;
      mockFileService.create.mockImplementation(async () => {
        createCallCount++;
        if (createCallCount === 2) {
          throw new Error('Disk full');
        }
        return { id: `file-${createCallCount}` };
      });

      const updatePromises = Array.from({ length: 3 }, (_, i) =>
        flowRunService.updateStatus({
          flowRunId,
          status: FlowRunStatus.RUNNING,
          tasks: i + 1,
          duration: (i + 1) * 1000,
          executionState: { steps: {} },
          projectId: 'project-1',
          tags: [`tag-${i}`],
        })
      );

      const results = await Promise.allSettled(updatePromises);

      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(2);
      expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
      
      const rejectedResult = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
      expect(rejectedResult.reason.message).toBe('Disk full');
    });
  });

  describe('Priority and Rate Limiting Under Load', () => {
    it('should handle concurrent execution with different priorities', async () => {
      mockFlowService.getOnePopulatedOrThrow.mockResolvedValue(mockFlow as any);
      mockFlowRunSideEffects.start.mockResolvedValue('job-1');

      const highPriorityPromises = Array.from({ length: 2 }, (_, i) =>
        flowRunService.start({
          projectId: 'project-1',
          flowId: 'flow-1',
          flowVersionId: 'flow-version-1',
          environment: RunEnvironment.PRODUCTION,
          executionType: ExecutionType.BEGIN,
          synchronousHandlerId: `sync-handler-${i}`,
          executionCorrelationId: `high-priority-${i}`,
          payload: { data: 'high-priority' },
        })
      );

      const lowPriorityPromises = Array.from({ length: 2 }, (_, i) =>
        flowRunService.start({
          projectId: 'project-1',
          flowId: 'flow-1',
          flowVersionId: 'flow-version-1',
          environment: RunEnvironment.PRODUCTION,
          executionType: ExecutionType.BEGIN,
          synchronousHandlerId: undefined,
          executionCorrelationId: `low-priority-${i}`,
          payload: { data: 'low-priority' },
        })
      );

      const results = await Promise.all([...highPriorityPromises, ...lowPriorityPromises]);

      expect(results).toHaveLength(4);
      expect(mockFlowRunSideEffects.start).toHaveBeenCalledTimes(4);
      
      const highPriorityJobs = mockFlowRunSideEffects.start.mock.calls.filter(call =>
        call[0].synchronousHandlerId !== undefined
      );
      const lowPriorityJobs = mockFlowRunSideEffects.start.mock.calls.filter(call =>
        call[0].synchronousHandlerId === undefined
      );
      
      expect(highPriorityJobs).toHaveLength(2);
      expect(lowPriorityJobs).toHaveLength(2);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle concurrent operations with large execution states', async () => {
      const flowRunId = 'run-1';
      mockFileService.create.mockResolvedValue({ id: 'file-1' } as any);

      const createLargeState = (size: number) => ({
        steps: Object.fromEntries(
          Array.from({ length: size }, (_, i) => [
            `step-${i}`,
            { output: { data: 'x'.repeat(1000), index: i } }
          ])
        ),
      });

      const updatePromises = Array.from({ length: 3 }, (_, i) =>
        flowRunService.updateStatus({
          flowRunId,
          status: FlowRunStatus.RUNNING,
          tasks: i + 1,
          duration: (i + 1) * 1000,
          executionState: createLargeState(50 * (i + 1)),
          projectId: 'project-1',
          tags: [`large-state-${i}`],
        })
      );

      const results = await Promise.all(updatePromises);

      expect(results).toHaveLength(3);
      expect(mockFileService.create).toHaveBeenCalledTimes(3);
      
      const createCalls = mockFileService.create.mock.calls;
      expect(createCalls.every(call => call[0].data.length > 0)).toBe(true);
    });

    it('should handle memory pressure during concurrent file operations', async () => {
      const flowRunId = 'run-1';
      
      let memoryUsage = 0;
      mockFileService.create.mockImplementation(async (params) => {
        memoryUsage += params.data.length;
        if (memoryUsage > 1000000) { // 1MB limit
          throw new Error('Out of memory');
        }
        return { id: `file-${Date.now()}` };
      });

      const largeExecutionState = {
        steps: Object.fromEntries(
          Array.from({ length: 200 }, (_, i) => [
            `step-${i}`,
            { output: { data: 'x'.repeat(2000) } }
          ])
        ),
      };

      const updatePromises = Array.from({ length: 5 }, (_, i) =>
        flowRunService.updateStatus({
          flowRunId,
          status: FlowRunStatus.RUNNING,
          tasks: i + 1,
          duration: (i + 1) * 1000,
          executionState: largeExecutionState,
          projectId: 'project-1',
          tags: [`memory-test-${i}`],
        })
      );

      const results = await Promise.allSettled(updatePromises);

      const successfulUpdates = results.filter(r => r.status === 'fulfilled');
      const failedUpdates = results.filter(r => r.status === 'rejected');

      expect(successfulUpdates.length).toBeGreaterThan(0);
      expect(failedUpdates.length).toBeGreaterThan(0);
      
      const memoryError = failedUpdates.find(r => 
        (r as PromiseRejectedResult).reason.message === 'Out of memory'
      );
      expect(memoryError).toBeDefined();
    });
  });
});