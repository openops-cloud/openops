import {
  TriggerStrategy,
  WebhookRenewStrategy,
} from '@openops/blocks-framework';
import {
  AppSystemProp,
  JobType,
  LATEST_JOB_DATA_SCHEMA_VERSION,
  RepeatableJobType,
  system,
} from '@openops/server-shared';
import {
  BlockTrigger,
  EngineResponseStatus,
  FlowVersion,
  isNil,
  OpsEdition,
  ProjectId,
  RunEnvironment,
  ScheduleOptions,
  TriggerHookType,
  TriggerType,
} from '@openops/shared';
import {
  EngineHelperResponse,
  EngineHelperTriggerResult,
  engineRunner,
  webhookUtils,
} from 'server-worker';
import { appEventRoutingService } from '../../../app-event-routing/app-event-routing.service';
import { accessTokenManager } from '../../../authentication/lib/access-token-manager';
import { flowQueue } from '../../../workers/queue';
import { triggerUtils } from './trigger-utils';

const POLLING_FREQUENCY_CRON_EXPRESSON = constructEveryXMinuteCron(
  system.getNumber(AppSystemProp.TRIGGER_DEFAULT_POLL_INTERVAL) ?? 5,
);

function constructEveryXMinuteCron(minute: number): string {
  const edition = system.getEdition();
  switch (edition) {
    case OpsEdition.CLOUD:
      return `*/${minute} * * * *`;
    case OpsEdition.COMMUNITY:
    case OpsEdition.ENTERPRISE:
      return `*/${
        system.getNumber(AppSystemProp.TRIGGER_DEFAULT_POLL_INTERVAL) ?? 5
      } * * * *`;
  }
}

export const enableBlockTrigger = async (
  params: EnableParams,
): Promise<EngineHelperResponse<
  EngineHelperTriggerResult<TriggerHookType.ON_ENABLE>
> | null> => {
  const { flowVersion, projectId, simulate } = params;
  if (flowVersion.trigger.type !== TriggerType.BLOCK) {
    return null;
  }
  const flowTrigger = flowVersion.trigger as BlockTrigger;
  const blockTrigger = await triggerUtils.getBlockTriggerOrThrow({
    trigger: flowTrigger,
    projectId,
  });

  const webhookUrl = await webhookUtils.getWebhookUrl({
    flowId: flowVersion.flowId,
    simulate,
  });

  const engineToken = await accessTokenManager.generateEngineToken({
    projectId,
  });

  const engineHelperResponse = await engineRunner.executeTrigger(engineToken, {
    hookType: TriggerHookType.ON_ENABLE,
    flowVersion,
    webhookUrl,
    projectId,
    test: simulate,
  });

  if (engineHelperResponse.status !== EngineResponseStatus.OK) {
    return engineHelperResponse;
  }

  switch (blockTrigger.type) {
    case TriggerStrategy.APP_WEBHOOK: {
      const appName = flowTrigger.settings.blockName;
      for (const listener of engineHelperResponse.result.listeners) {
        await appEventRoutingService.createListeners({
          projectId,
          flowId: flowVersion.flowId,
          appName,
          events: listener.events,
          identifierValue: listener.identifierValue,
        });
      }
      break;
    }
    case TriggerStrategy.WEBHOOK: {
      const renewConfiguration = blockTrigger.renewConfiguration;
      switch (renewConfiguration?.strategy) {
        case WebhookRenewStrategy.CRON: {
          await flowQueue.add({
            executionCorrelationId: flowVersion.id,
            type: JobType.REPEATING,
            data: {
              schemaVersion: LATEST_JOB_DATA_SCHEMA_VERSION,
              projectId,
              flowVersionId: flowVersion.id,
              flowId: flowVersion.flowId,
              jobType: RepeatableJobType.RENEW_WEBHOOK,
            },
            scheduleOptions: {
              cronExpression: renewConfiguration.cronExpression,
              timezone: 'UTC',
              failureCount: 0,
            },
          });
          break;
        }
        default:
          break;
      }
      break;
    }
    case TriggerStrategy.POLLING: {
      if (isNil(engineHelperResponse.result.scheduleOptions)) {
        engineHelperResponse.result.scheduleOptions = {
          cronExpression: POLLING_FREQUENCY_CRON_EXPRESSON,
          timezone: 'UTC',
          failureCount: 0,
        };
      }

      const scheduleOptions = engineHelperResponse.result.scheduleOptions;

      await addBlockTriggerToQueue(projectId, flowVersion, scheduleOptions);

      break;
    }
    case TriggerStrategy.SCHEDULED: {
      const scheduleOptions = engineHelperResponse.result.scheduleOptions;

      if (isNil(scheduleOptions)) {
        throw new Error(
          'No schedule options set for trigger of Schedule type.',
        );
      }

      await addBlockTriggerToQueue(projectId, flowVersion, scheduleOptions);

      break;
    }
  }

  return engineHelperResponse;
};

type EnableParams = {
  projectId: ProjectId;
  flowVersion: FlowVersion;
  simulate: boolean;
};

async function addBlockTriggerToQueue(
  projectId: string,
  flowVersion: FlowVersion,
  scheduleOptions: ScheduleOptions,
): Promise<void> {
  await flowQueue.add({
    executionCorrelationId: flowVersion.id,
    type: JobType.REPEATING,
    data: {
      schemaVersion: LATEST_JOB_DATA_SCHEMA_VERSION,
      projectId,
      environment: RunEnvironment.PRODUCTION,
      flowVersionId: flowVersion.id,
      flowId: flowVersion.flowId,
      triggerType: TriggerType.BLOCK,
      jobType: RepeatableJobType.EXECUTE_TRIGGER,
    },
    scheduleOptions,
  });
}
