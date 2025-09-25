import {
  TriggerStrategy,
  WebhookRenewStrategy,
} from '@openops/blocks-framework';
import {
  JobType,
  LATEST_JOB_DATA_SCHEMA_VERSION,
  logger,
  OneTimeJobData,
  QueueName,
  RepeatableJobType,
  ScheduledJobData,
  WebhookJobData,
} from '@openops/server-shared';
import {
  Flow,
  FlowRun,
  FlowRunStatus,
  isNil,
  ProgressUpdateType,
  RunEnvironment,
  TriggerType,
} from '@openops/shared';
import dayjs from 'dayjs';
import { flowRunRepo } from '../../flows/flow-run/flow-run-service';
import { flowVersionService } from '../../flows/flow-version/flow-version.service';
import { flowService } from '../../flows/flow/flow.service';
import { triggerUtils } from '../../flows/trigger/hooks/trigger-utils';
import { QueueManager } from '../queue/queue-manager';
import { MemoryQueue } from './custom-memory-queue';

export const memoryQueues = {
  [QueueName.ONE_TIME]: new MemoryQueue<OneTimeJobData>(),
  [QueueName.SCHEDULED]: new MemoryQueue<ScheduledJobData>(),
  [QueueName.WEBHOOK]: new MemoryQueue<WebhookJobData>(),
};

export const memoryQueue: QueueManager = {
  findJobsOlderThan(): Promise<string[]> {
    return Promise.resolve([]);
  },
  removeJob(): Promise<void> {
    return Promise.resolve();
  },
  async removeRepeatingJob({ flowVersionId }) {
    await memoryQueues[QueueName.SCHEDULED].remove(flowVersionId);
  },
  async init(): Promise<void> {
    await renewWebhooks();
    await renewEnabledRepeating();
    await addDelayedRun();
  },
  async add(params) {
    const { type, data, executionCorrelationId } = params;
    switch (type) {
      case JobType.ONE_TIME: {
        memoryQueues[QueueName.ONE_TIME].add({
          id: executionCorrelationId,
          data,
        });
        break;
      }
      case JobType.REPEATING: {
        memoryQueues[QueueName.SCHEDULED].add({
          data,
          id: executionCorrelationId,
          cronExpression: params.scheduleOptions.cronExpression,
          cronTimezone: params.scheduleOptions.timezone,
          failureCount: params.scheduleOptions.failureCount,
        });
        break;
      }
      case JobType.DELAYED: {
        memoryQueues[QueueName.SCHEDULED].add({
          id: executionCorrelationId,
          data,
          nextFireAtEpochSeconds: dayjs().add(params.delay, 'ms').unix(),
        });
        break;
      }
      case JobType.WEBHOOK: {
        memoryQueues[QueueName.WEBHOOK].add({
          id: executionCorrelationId,
          data,
        });
        break;
      }
    }

    return true;
  },
};

type FlowWithRenewWebhook = {
  flow: Flow;
  scheduleOptions: {
    cronExpression: string;
    timezone: string;
  };
};

async function addDelayedRun(): Promise<void> {
  const flowRuns = await flowRunRepo().findBy({
    status: FlowRunStatus.PAUSED,
  });
  flowRuns.forEach((flowRun: FlowRun) => {
    if (flowRun.pauseMetadata?.resumeDateTime) {
      const delay = Math.max(
        0,
        dayjs(flowRun.pauseMetadata.resumeDateTime).diff(dayjs(), 'ms'),
      );

      memoryQueue
        .add({
          executionCorrelationId: flowRun.id,
          type: JobType.DELAYED,
          data: {
            executionCorrelationId: flowRun.id,
            runId: flowRun.id,
            projectId: flowRun.projectId,
            environment: RunEnvironment.PRODUCTION,
            schemaVersion: LATEST_JOB_DATA_SCHEMA_VERSION,
            flowVersionId: flowRun.flowVersionId,
            jobType: RepeatableJobType.DELAYED_FLOW,
            synchronousHandlerId: flowRun.pauseMetadata.handlerId ?? null,
            progressUpdateType:
              flowRun.pauseMetadata.progressUpdateType ??
              ProgressUpdateType.NONE,
            resumePayload: {
              ...flowRun.pauseMetadata,
            },
          },
          delay,
        })
        .catch((e) => logger.error(e, '[MemoryQueue#init] add'));
    }
  });
}

async function renewEnabledRepeating(): Promise<void> {
  const enabledFlows = await flowService.getAllEnabled();
  const enabledRepeatingFlows = enabledFlows.filter((flow) => flow.schedule);
  enabledRepeatingFlows.forEach((flow) => {
    memoryQueue
      .add({
        executionCorrelationId: flow.id,
        type: JobType.REPEATING,
        data: {
          projectId: flow.projectId,
          environment: RunEnvironment.PRODUCTION,
          schemaVersion: 1,
          flowVersionId: flow.publishedVersionId!,
          flowId: flow.id,
          triggerType: TriggerType.BLOCK,
          triggerStrategy: TriggerStrategy.SCHEDULED,
          jobType: RepeatableJobType.EXECUTE_TRIGGER,
        },
        scheduleOptions: {
          cronExpression: flow.schedule!.cronExpression,
          timezone: flow.schedule!.timezone,
          failureCount: flow.schedule!.failureCount ?? 0,
        },
      })
      .catch((e) => logger.error(e, '[MemoryQueue#init] add'));
  });
}

async function renewWebhooks(): Promise<void> {
  const enabledFlows = await flowService.getAllEnabled();
  const enabledRenewWebhookFlows = (
    await Promise.all(
      enabledFlows.map(async (flow) => {
        const flowVersion = await flowVersionService.getOneOrThrow(
          flow.publishedVersionId!,
        );
        const trigger = flowVersion.trigger;

        if (trigger.type !== TriggerType.BLOCK) {
          return null;
        }

        const block = await triggerUtils.getBlockTrigger({
          trigger,
          projectId: flow.projectId,
        });

        if (isNil(block)) {
          logger.warn(
            {
              trigger,
              flowId: flow.id,
            },
            'Block not found for trigger',
          );
          return null;
        }

        const renewConfiguration = block.renewConfiguration;

        if (renewConfiguration?.strategy !== WebhookRenewStrategy.CRON) {
          return null;
        }

        return {
          scheduleOptions: {
            cronExpression: renewConfiguration.cronExpression,
            timezone: 'UTC',
          },
          flow,
        };
      }),
    )
  ).filter((flow): flow is FlowWithRenewWebhook => flow !== null);
  enabledRenewWebhookFlows.forEach(({ flow, scheduleOptions }) => {
    memoryQueue
      .add({
        executionCorrelationId: flow.id,
        type: JobType.REPEATING,
        data: {
          projectId: flow.projectId,
          schemaVersion: LATEST_JOB_DATA_SCHEMA_VERSION,
          flowVersionId: flow.publishedVersionId!,
          flowId: flow.id,
          jobType: RepeatableJobType.RENEW_WEBHOOK,
        },
        scheduleOptions: {
          ...scheduleOptions,
          failureCount: 0,
        },
      })
      .catch((e) => logger.error(e, '[MemoryQueue#init] add'));
  });
}
