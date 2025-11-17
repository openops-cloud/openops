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
      const triggerStepName = flowVersion.trigger.name;
      const triggerStepId = flowVersion.trigger.id;
      const triggerError = {
        message:
          result?.message ?? 'Failed to execute trigger due to unknown error',
      } as { message?: string };

      handleFailureFlow(
        flowVersion,
        projectId,
        engineToken,
        false,
        !simulate
          ? {
              reason: 'TRIGGER_HOOK_FAILED',
              flowVersionId: flowVersion.id,
              triggerStepName,
              triggerStepId,
              triggerError,
            }
          : undefined,
      );
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
      const triggerStepName = flowVersion.trigger.name;
      const triggerStepId = flowVersion.trigger.id;
      const triggerError = {
        message: 'Trigger execution timed out',
        code: ErrorCode.EXECUTION_TIMEOUT,
      } as { message?: string; code?: string };

      handleFailureFlow(
        flowVersion,
        projectId,
        engineToken,
        false,
        !simulate
          ? {
              reason: 'TRIGGER_TIMEOUT',
              flowVersionId: flowVersion.id,
              triggerStepName,
              triggerStepId,
              triggerError,
            }
          : undefined,
      );
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
  failureDetails?: {
    reason?: string;
    flowVersionId?: string;
    triggerStepName?: string;
    triggerStepId?: string;
    triggerError?: { message?: string; code?: string; details?: unknown };
  },
): void {
  const engineController = engineApiService(engineToken);

  rejectedPromiseHandler(
    engineController.updateFailureCount({
      flowId: flowVersion.flowId,
      projectId,
      success,
      ...(failureDetails ?? {}),
      ...(failureDetails?.flowVersionId
        ? { flowVersionId: failureDetails.flowVersionId }
        : {}),
    }),
  );
}

type ExecuteTrigger = {
  flowVersion: FlowVersion;
  projectId: ProjectId;
  simulate: boolean;
  payload: TriggerPayload;
};
