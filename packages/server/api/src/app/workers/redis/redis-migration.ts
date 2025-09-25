import {
  distributedLock,
  LATEST_JOB_DATA_SCHEMA_VERSION,
  logger,
  QueueName,
  RepeatableJobType,
  ScheduledJobData,
} from '@openops/server-shared';
import {
  ExecutionType,
  isNil,
  RunEnvironment,
  ScheduleType,
} from '@openops/shared';
import { Job } from 'bullmq';
import { blockMetadataService } from '../../blocks/block-metadata-service';
import { flowVersionService } from '../../flows/flow-version/flow-version.service';
import { flowRepo } from '../../flows/flow/flow.repo';
import { bullMqGroups } from './redis-queue';

export const redisMigrations = {
  async run(): Promise<void> {
    const migrationLock = await distributedLock.acquireLock({
      key: 'jobs_lock',
      timeout: 30000,
    });
    try {
      const scheduledJobs = await getJobsToMigrate();
      if (scheduledJobs.length === 0) {
        return;
      }
      logger.info(
        {
          count: scheduledJobs.length,
        },
        'migration of scheduled jobs started',
      );
      for (const job of scheduledJobs) {
        if (job) {
          await migrateJob(job);
        }
      }
      logger.info('migration of scheduled jobs completed');
    } finally {
      await migrationLock.release();
    }
  },
};

async function getJobsToMigrate(): Promise<
  (Job<ScheduledJobData> | undefined)[]
> {
  return (await bullMqGroups[QueueName.SCHEDULED].getJobs()).filter(
    (job) =>
      !isNil(job?.data) &&
      job.data.schemaVersion !== LATEST_JOB_DATA_SCHEMA_VERSION,
  );
}

async function migrateJob(job: Job<ScheduledJobData>): Promise<void> {
  let modifiedJobData = JSON.parse(JSON.stringify(job.data));

  if (
    isNil(modifiedJobData.schemaVersion) ||
    modifiedJobData.schemaVersion === 1
  ) {
    const { flowVersion, projectId, triggerType } = modifiedJobData;
    modifiedJobData = {
      schemaVersion: 2,
      flowVersionId: flowVersion.id,
      flowId: flowVersion.flowId,
      projectId,
      environment: RunEnvironment.PRODUCTION,
      executionType: ExecutionType.BEGIN,
      triggerType,
    };
    await job.updateData(modifiedJobData);
  }

  if (modifiedJobData.schemaVersion === 2) {
    await updateCronExpressionOfRedisToPostgresTable(job);
    modifiedJobData.schemaVersion = 3;
    await job.updateData(modifiedJobData);
  }

  if (modifiedJobData.schemaVersion === 3) {
    modifiedJobData.schemaVersion = 4;
    if (modifiedJobData.executionType === ExecutionType.BEGIN) {
      modifiedJobData.jobType = RepeatableJobType.EXECUTE_TRIGGER;
    } else if (modifiedJobData.executionType === ExecutionType.RESUME) {
      modifiedJobData.jobType = RepeatableJobType.DELAYED_FLOW;
    }
    modifiedJobData.executionType = undefined;
    await job.updateData(modifiedJobData);
  }

  if (modifiedJobData.schemaVersion === 4) {
    modifiedJobData.schemaVersion = 5;

    modifiedJobData = await addTriggerStrategyForRepeatableJobType(
      modifiedJobData,
    );

    await job.updateData(modifiedJobData);
  }
}

async function updateCronExpressionOfRedisToPostgresTable(
  job: Job,
): Promise<void> {
  const { tz, pattern } = job.opts.repeat || {};
  if (isNil(tz) || isNil(pattern)) {
    logger.error('Found unrepeatable job in repeatable queue');
    return;
  }
  const flow = await flowRepo().findOneBy({
    publishedVersionId: job.data.flowVersionId,
  });
  if (isNil(flow)) {
    return;
  }
  await flowRepo().update(flow.id, {
    schedule: {
      type: ScheduleType.CRON_EXPRESSION,
      timezone: tz,
      cronExpression: pattern,
    },
  });
}

async function addTriggerStrategyForRepeatableJobType(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modifiedJobData: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (modifiedJobData.jobType === RepeatableJobType.EXECUTE_TRIGGER) {
    try {
      const flowVersion = await flowVersionService.getFlowVersionOrThrow({
        flowId: modifiedJobData.flowId,
        versionId: modifiedJobData.flowVersionId,
      });

      const blockMetadata = await blockMetadataService.getOrThrow({
        name: flowVersion.trigger.settings.blockName,
        version: flowVersion.trigger.settings.blockVersion,
        projectId: undefined,
      });

      const action =
        blockMetadata.triggers[flowVersion.trigger.settings.triggerName];

      modifiedJobData.triggerStrategy = action.type;
    } catch (error) {
      logger.warn('Failed to apply a trigger strategy', {
        error,
        modifiedJobData,
        flowId: modifiedJobData.flowId,
        flowVersionId: modifiedJobData.flowVersionId,
      });
    }
  }

  return modifiedJobData;
}
