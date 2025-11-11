import {
  TriggerBase,
  TriggerStrategy,
  WebhookRenewStrategy,
} from '@openops/blocks-framework';
import { exceptionHandler } from '@openops/server-shared';
import {
  BlockTrigger,
  FlowVersion,
  ProjectId,
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
import { accessTokenManager } from '../../../authentication/context/access-token-manager';
import { flowQueue } from '../../../workers/queue';
import { triggerUtils } from './trigger-utils';

export const disableBlockTrigger = async (
  params: DisableParams,
): Promise<EngineHelperResponse<
  EngineHelperTriggerResult<TriggerHookType.ON_DISABLE>
> | null> => {
  const { flowVersion, projectId, simulate } = params;
  if (flowVersion.trigger.type !== TriggerType.BLOCK) {
    return null;
  }
  const flowTrigger = flowVersion.trigger as BlockTrigger;
  const blockTrigger = await triggerUtils.getBlockTrigger({
    trigger: flowTrigger,
    projectId,
  });

  if (!blockTrigger) {
    return null;
  }

  try {
    const engineToken = await accessTokenManager.generateEngineToken({
      projectId,
    });
    const result = await engineRunner.executeTrigger(engineToken, {
      hookType: TriggerHookType.ON_DISABLE,
      flowVersion,
      webhookUrl: await webhookUtils.getWebhookUrl({
        flowId: flowVersion.flowId,
        simulate,
      }),
      test: simulate,
      projectId,
    });
    return result;
  } catch (error) {
    if (!params.ignoreError) {
      exceptionHandler.handle(error);
      throw error;
    }
    return null;
  } finally {
    await sideeffect(blockTrigger, projectId, flowVersion);
  }
};

async function sideeffect(
  blockTrigger: TriggerBase,
  projectId: string,
  flowVersion: FlowVersion,
): Promise<void> {
  switch (blockTrigger.type) {
    case TriggerStrategy.APP_WEBHOOK:
      await appEventRoutingService.deleteListeners({
        projectId,
        flowId: flowVersion.flowId,
      });
      break;
    case TriggerStrategy.WEBHOOK: {
      const renewConfiguration = blockTrigger.renewConfiguration;
      if (renewConfiguration?.strategy === WebhookRenewStrategy.CRON) {
        await flowQueue.removeRepeatingJob({
          flowVersionId: flowVersion.id,
        });
      }
      break;
    }
    case TriggerStrategy.POLLING:
    case TriggerStrategy.SCHEDULED:
      await flowQueue.removeRepeatingJob({
        flowVersionId: flowVersion.id,
      });
      break;
  }
}
type DisableParams = {
  projectId: ProjectId;
  flowVersion: FlowVersion;
  simulate: boolean;
  ignoreError?: boolean;
};
