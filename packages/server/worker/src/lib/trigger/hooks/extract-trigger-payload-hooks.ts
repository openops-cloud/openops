import { logger, rejectedPromiseHandler } from '@openops/server-shared';
import {
  ApplicationError,
  ErrorCode,
  FlowVersion,
  isNil,
  ProjectId,
  TriggerHookType,
  TriggerPayload,
} from '@openops/shared';
import { engineApiService } from '../../api/server-api.service';
import { engineRunner } from '../../engine';
import { webhookUtils } from '../../utils/webhook-utils';

export async function extractPayloads(
  engineToken: string,
  params: ExecuteTrigger,
): Promise<unknown[]> {
  const { payload, flowVersion, projectId, simulate } = params;
  try {
    const { blockName, blockVersion } = flowVersion.trigger.settings;
    const { result } = await engineRunner.executeTrigger(engineToken, {
      hookType: TriggerHookType.RUN,
      flowVersion,
      triggerPayload: payload,
      webhookUrl: await webhookUtils.getWebhookUrl({
        flowId: flowVersion.flowId,
        simulate,
      }),
      projectId,
      test: simulate,
    });
    if (!isNil(result) && result.success && Array.isArray(result.output)) {
      handleFailureFlow(flowVersion, projectId, engineToken, true);
      return result.output as unknown[];
    } else {
      logger.error(
        {
          result,
          blockName,
          blockVersion,
          flowId: flowVersion.flowId,
        },
        'Failed to execute trigger',
      );
      handleFailureFlow(flowVersion, projectId, engineToken, false);
      if (!simulate) {
        const triggerStepName = flowVersion.trigger.name;
        const triggerStepId = flowVersion.trigger.id;
        const triggerError = {
          message:
            result?.message ?? 'Trigger hook failed before runs were enqueued',
        } as { message?: string };
        rejectedPromiseHandler(
          engineApiService(engineToken).recordTriggerFailure({
            flowVersionId: flowVersion.id,
            projectId,
            reason: 'TRIGGER_HOOK_FAILED',
            triggerStepName,
            triggerStepId,
            triggerError,
          }),
        );
      }
      return [];
    }
  } catch (e) {
    const isTimeoutError =
      e instanceof ApplicationError &&
      e.error.code === ErrorCode.EXECUTION_TIMEOUT;
    if (isTimeoutError) {
      logger.error(
        {
          name: 'extractPayloads',
          blockName: flowVersion.trigger.settings.blockName,
          blockVersion: flowVersion.trigger.settings.blockVersion,
          flowId: flowVersion.flowId,
        },
        'Failed to execute trigger due to timeout',
      );
      handleFailureFlow(flowVersion, projectId, engineToken, false);
      if (!simulate) {
        const triggerStepName = flowVersion.trigger.name;
        const triggerStepId = flowVersion.trigger.id;
        const triggerError = {
          message: 'Trigger execution timed out',
          code: ErrorCode.EXECUTION_TIMEOUT,
        } as { message?: string; code?: string };
        rejectedPromiseHandler(
          engineApiService(engineToken).recordTriggerFailure({
            flowVersionId: flowVersion.id,
            projectId,
            reason: 'TRIGGER_TIMEOUT',
            triggerStepName,
            triggerStepId,
            triggerError,
          }),
        );
      }
      return [];
    }
    throw e;
  }
}

function handleFailureFlow(
  flowVersion: FlowVersion,
  projectId: ProjectId,
  engineToken: string,
  success: boolean,
): void {
  const engineController = engineApiService(engineToken);

  rejectedPromiseHandler(
    engineController.updateFailureCount({
      flowId: flowVersion.flowId,
      projectId,
      success,
    }),
  );
}

type ExecuteTrigger = {
  flowVersion: FlowVersion;
  projectId: ProjectId;
  simulate: boolean;
  payload: TriggerPayload;
};
