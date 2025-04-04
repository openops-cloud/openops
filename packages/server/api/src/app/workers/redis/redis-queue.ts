import {
  createRedisClient,
  exceptionHandler,
  JobType,
  logger,
  QueueName,
} from '@openops/server-shared';
import { ApplicationError, ErrorCode, isNil, OpenOpsId } from '@openops/shared';
import { DefaultJobOptions, Queue } from 'bullmq';
import { AddParams, JOB_PRIORITY, QueueManager } from '../queue/queue-manager';
import { expiredFlowRunCleaner } from './flow-run-cleaner';
import { redisMigrations } from './redis-migration';
import { redisRateLimiter } from './redis-rate-limiter';

const defaultJobOptions: DefaultJobOptions = {
  attempts: 0,
  removeOnComplete: true,
  removeOnFail: true,
};
const repeatingJobKey = (flowVersionId: OpenOpsId): string =>
  `openops:repeatJobKey:${flowVersionId}`;

export const bullMqGroups: Record<string, Queue> = {};

const jobTypeToQueueName: Record<JobType, QueueName> = {
  [JobType.DELAYED]: QueueName.SCHEDULED,
  [JobType.ONE_TIME]: QueueName.ONE_TIME,
  [JobType.REPEATING]: QueueName.SCHEDULED,
  [JobType.WEBHOOK]: QueueName.WEBHOOK,
};

export const redisQueue: QueueManager = {
  async init(): Promise<void> {
    await redisRateLimiter.init();
    const queues = Object.values(QueueName).map((queueName) =>
      ensureQueueExists(queueName),
    );
    await Promise.all(queues);
    await redisMigrations.run();
    logger.info('[redisQueueManager#init] Redis queues initialized');

    // TODO: Remove after redis cleanup
    await expiredFlowRunCleaner();
  },
  async add(params): Promise<boolean> {
    const { type, data } = params;
    const { shouldRateLimit } = await redisRateLimiter.shouldBeLimited(
      jobTypeToQueueName[type],
      data.projectId,
      1,
    );

    if (shouldRateLimit) {
      await redisRateLimiter.rateLimitJob(params);
      return false;
    }

    switch (type) {
      case JobType.REPEATING: {
        await addRepeatingJob(params);
        break;
      }
      case JobType.DELAYED: {
        await addDelayedJob(params);
        break;
      }
      case JobType.ONE_TIME: {
        const queue = await ensureQueueExists(QueueName.ONE_TIME);
        return addJobWithPriority(queue, params);
      }
      case JobType.WEBHOOK: {
        const queue = await ensureQueueExists(QueueName.WEBHOOK);
        return addJobWithPriority(queue, params);
      }
    }

    return true;
  },
  async removeRepeatingJob({ flowVersionId }): Promise<void> {
    const queue = await ensureQueueExists(QueueName.SCHEDULED);
    const client = await queue.client;
    const repeatJob = await findRepeatableJobKey(flowVersionId);
    if (isNil(repeatJob)) {
      const message = `Couldn't find job key for flow version id "${flowVersionId}"`;
      logger.warn(message, {
        flowVersionId,
      });
      exceptionHandler.handle(new Error(message));
      return;
    }
    logger.info(
      {
        flowVersionId,
      },
      '[redisQueue#removeRepeatingJob] removing the jobs',
    );
    const result = await queue.removeRepeatableByKey(repeatJob);
    if (!result) {
      throw new ApplicationError({
        code: ErrorCode.JOB_REMOVAL_FAILURE,
        params: {
          flowVersionId,
        },
      });
    }
    await client.del(repeatingJobKey(flowVersionId));
  },
  async findJobsOlderThan(timestamp: number): Promise<string[]> {
    logger.info(`Search for jobs older than ${timestamp}.`);

    const jobs = await findOlderJobs(timestamp);

    logger.info(`Found ${jobs.length} jobs older than ${timestamp}.`);

    return jobs;
  },
  async removeJob(queueName: QueueName, jobId: string): Promise<void> {
    const queue = await ensureQueueExists(queueName);

    await queue.remove(jobId);
  },
};

async function findRepeatableJobKey(
  flowVersionId: OpenOpsId,
): Promise<string | undefined> {
  const queue = await ensureQueueExists(QueueName.SCHEDULED);
  const client = await queue.client;
  const jobKey = await client.get(repeatingJobKey(flowVersionId));
  if (isNil(jobKey)) {
    logger.warn(
      { flowVersionId },
      'Job key not found in redis, trying to find it in the queue',
    );
    // TODO: this temporary solution for jobs that doesn't have repeatJobKey in redis, it's also confusing because it search by flowVersionId
    const jobs = await queue.getJobs();
    const jobKeyInRedis = jobs
      .filter((f) => !isNil(f) && !isNil(f.data))
      .find((f) => f.data.flowVersionId === flowVersionId);
    return jobKeyInRedis?.repeatJobKey;
  }
  return jobKey;
}

async function findOlderJobs(timestamp: number): Promise<string[]> {
  const queue = await ensureQueueExists(QueueName.ONE_TIME);

  const jobs = await queue.getJobs();

  return jobs
    .filter((f) => !isNil(f) && !isNil(f.data) && f.timestamp < timestamp)
    .map((f) => f.data.executionCorrelationId);
}

async function ensureQueueExists(queueName: QueueName): Promise<Queue> {
  if (!isNil(bullMqGroups[queueName])) {
    return bullMqGroups[queueName];
  }
  bullMqGroups[queueName] = new Queue(queueName, {
    connection: createRedisClient(),
    defaultJobOptions,
  });
  await bullMqGroups[queueName].waitUntilReady();
  return bullMqGroups[queueName];
}

async function addJobWithPriority(
  queue: Queue,
  params: AddParams<JobType.WEBHOOK | JobType.ONE_TIME>,
): Promise<boolean> {
  const { data, priority, executionCorrelationId } = params;

  const existingJob = await queue.getJob(executionCorrelationId);
  if (existingJob) {
    logger.info(
      'The job was not added because it already exists in the queue.',
      data,
    );
    return false;
  }

  await queue.add(executionCorrelationId, data, {
    jobId: executionCorrelationId,
    priority: JOB_PRIORITY[priority],
  });

  return true;
}

async function addDelayedJob(
  params: AddParams<JobType.DELAYED>,
): Promise<void> {
  const { executionCorrelationId, data, delay } = params;
  const queue = await ensureQueueExists(QueueName.SCHEDULED);

  await queue.add(executionCorrelationId, data, {
    jobId: executionCorrelationId,
    delay,
  });
}

async function addRepeatingJob(
  params: AddParams<JobType.REPEATING>,
): Promise<void> {
  const { executionCorrelationId, data, scheduleOptions } = params;
  const queue = await ensureQueueExists(QueueName.SCHEDULED);

  const job = await queue.add(executionCorrelationId, data, {
    jobId: executionCorrelationId,
    repeat: {
      pattern: scheduleOptions.cronExpression,
      tz: scheduleOptions.timezone,
    },
  });
  if (isNil(job.repeatJobKey)) {
    return;
  }
  const client = await queue.client;
  await client.set(repeatingJobKey(executionCorrelationId), job.repeatJobKey);
}
