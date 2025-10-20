import { flowTimeoutSandbox, logger, QueueName } from '@openops/server-shared';
import { FlowRunStatus } from '@openops/shared';
import { flowRunService } from '../../flows/flow-run/flow-run-service';
import { redisQueue } from './redis-queue';

export async function expiredFlowRunCleaner(): Promise<void> {
  const flowTimeoutInMilliseconds = (flowTimeoutSandbox + 60) * 1000; // Adding 60 seconds to the timeout

  const now = Date.now();
  const expirationTimestamp = now - flowTimeoutInMilliseconds;
  const expiredISOString = new Date(
    now - flowTimeoutInMilliseconds,
  ).toISOString();

  logger.debug(`Search for workflows older than ${expiredISOString}.`);

  await removeExpiredJobs(expirationTimestamp);

  await markExpiredWorkflowsAsFailed(expiredISOString);
}

async function removeExpiredJobs(expirationTimestamp: number): Promise<void> {
  try {
    const expiredJobs = await redisQueue.findJobsOlderThan(expirationTimestamp);

    for (const executionCorrelationId of expiredJobs) {
      await redisQueue.removeJob(QueueName.ONE_TIME, executionCorrelationId);
    }
  } catch (error) {
    logger.warn('Failed to remove expired workflows from redis queue.', {
      error,
    });
  }
}

async function markExpiredWorkflowsAsFailed(
  expiredISOString: string,
): Promise<void> {
  try {
    const expiredFlowRuns = await flowRunService.getRunningWorkflowsOlderThan(
      expiredISOString,
    );

    for (const flowRun of expiredFlowRuns) {
      await flowRunService.updateStatus({
        flowRunId: flowRun.id,
        status: FlowRunStatus.TIMEOUT,
        duration: flowRun.duration,
        projectId: flowRun.projectId,
        executionState: null,
        tasks: flowRun.tasks ?? 0,
        tags: flowRun.tags ?? [],
        terminationReason: flowRun.terminationReason,
      });
    }
  } catch (error) {
    logger.warn('Failed to change the status of expired flow runs.', {
      error,
    });
  }
}
