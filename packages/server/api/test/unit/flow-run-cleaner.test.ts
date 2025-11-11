import { flowTimeoutSandbox, logger, QueueName } from '@openops/server-shared';
import { FlowRunStatus } from '@openops/shared';
import { accessTokenManager } from '../../src/app/authentication/tokens/access-token-manager';
import { flowRunService } from '../../src/app/flows/flow-run/flow-run-service';
import { expiredFlowRunCleaner } from '../../src/app/workers/redis/flow-run-cleaner';
import { redisQueue } from '../../src/app/workers/redis/redis-queue';

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../src/app/authentication/tokens/access-token-manager', () => ({
  accessTokenManager: {
    generateWorkerToken: jest.fn(),
  },
}));

jest.mock('../../src/app/workers/redis/redis-queue', () => ({
  redisQueue: {
    findJobsOlderThan: jest.fn(),
    removeJob: jest.fn(),
  },
}));

jest.mock('../../src/app/flows/flow-run/flow-run-service', () => ({
  flowRunService: {
    getRunningWorkflowsOlderThan: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

describe('Expired flow-run cleaner', () => {
  const mockTimestamp = 1700000000000;

  beforeEach(() => {
    jest.clearAllMocks();
    global.Date.now = jest.fn(() => mockTimestamp);
  });

  it('should remove expired workflows from Redis queue and mark them as failed', async () => {
    const flowTimeoutInMilliseconds = (flowTimeoutSandbox + 60) * 1000;
    const expirationTimestamp = mockTimestamp - flowTimeoutInMilliseconds;
    const expiredISOString = new Date(expirationTimestamp).toISOString();

    const workerToken = 'test-worker-token';
    const expiredJobs = ['job1', 'job2'];
    const expiredFlowRuns = [
      {
        id: 'flowRun1',
        duration: 100,
        projectId: 'proj1',
        tasks: 5,
        tags: ['tag1'],
      },
      { id: 'flowRun2', duration: 200, projectId: 'proj2', tasks: 10 },
    ];

    (accessTokenManager.generateWorkerToken as jest.Mock).mockResolvedValue(
      workerToken,
    );
    (redisQueue.findJobsOlderThan as jest.Mock).mockResolvedValue(expiredJobs);
    (
      flowRunService.getRunningWorkflowsOlderThan as jest.Mock
    ).mockResolvedValue(expiredFlowRuns);

    await expiredFlowRunCleaner();

    expect(redisQueue.findJobsOlderThan).toHaveBeenCalledWith(
      expirationTimestamp,
    );
    expect(redisQueue.removeJob).toHaveBeenCalledTimes(expiredJobs.length);
    expiredJobs.forEach((jobId) => {
      expect(redisQueue.removeJob).toHaveBeenCalledWith(
        QueueName.ONE_TIME,
        jobId,
      );
    });

    expect(flowRunService.getRunningWorkflowsOlderThan).toHaveBeenCalledWith(
      expiredISOString,
    );
    expect(flowRunService.updateStatus).toHaveBeenCalledTimes(
      expiredFlowRuns.length,
    );
    expiredFlowRuns.forEach((flowRun) => {
      expect(flowRunService.updateStatus).toHaveBeenCalledWith({
        flowRunId: flowRun.id,
        status: FlowRunStatus.TIMEOUT,
        duration: flowRun.duration,
        projectId: flowRun.projectId,
        executionState: null,
        tasks: flowRun.tasks ?? 0,
        tags: flowRun.tags ?? [],
      });
    });

    expect(logger.debug).toHaveBeenCalledWith(
      `Search for workflows older than ${expiredISOString}.`,
    );
  });

  it('should log a warning if removing expired workflows from Redis queue fails', async () => {
    const error = new Error('Redis queue error');
    (redisQueue.findJobsOlderThan as jest.Mock).mockRejectedValue(error);

    await expiredFlowRunCleaner();

    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to remove expired workflows from redis queue.',
      { error },
    );
  });

  it('should log a warning if marking expired workflows as failed fails', async () => {
    const error = new Error('Database error');
    (
      flowRunService.getRunningWorkflowsOlderThan as jest.Mock
    ).mockRejectedValue(error);

    await expiredFlowRunCleaner();

    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to change the status of expired flow runs.',
      { error },
    );
  });
});
