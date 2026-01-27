import { TriggerStrategy } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { PopulatedFlow, TriggerHookType, TriggerType } from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { engineRunner, webhookUtils } from 'server-worker';
import { accessTokenManager } from '../../authentication/context/access-token-manager';
import { triggerUtils } from '../trigger/hooks/trigger-utils';

type ManualRunValidationResult =
  | {
      success: true;
      payload: unknown;
    }
  | {
      success: false;
      message: string;
    };

export async function resolveManualPayload(
  request: FastifyRequest,
  flow: PopulatedFlow,
): Promise<ManualRunValidationResult> {
  const projectId = request.principal.projectId;
  const blockTrigger = flow.version.trigger;

  if (blockTrigger.type !== TriggerType.BLOCK) {
    logger.warn(
      `Block type is not of type ${TriggerType.BLOCK}. This should never happen. `,
    );
    return {
      success: false,
      message: `Trigger type is not a block: type: ${blockTrigger.type}`,
    };
  }

  try {
    const metadata = await triggerUtils.getBlockTriggerOrThrow({
      trigger: blockTrigger,
      projectId,
    });

    switch (metadata.type) {
      case TriggerStrategy.SCHEDULED: {
        const engineToken = await accessTokenManager.generateEngineToken({
          projectId: request.principal.projectId,
        });

        const { result } = await engineRunner.executeTrigger(engineToken, {
          hookType: TriggerHookType.RUN,
          flowVersion: flow.version,
          webhookUrl: await webhookUtils.getWebhookUrl({
            flowId: flow.version.flowId,
            simulate: false,
          }),
          projectId: request.principal.projectId,
          test: false,
        });

        const payload =
          result?.success && Array.isArray(result.output)
            ? result.output[0] ?? {}
            : {};

        return {
          success: true,
          payload,
        };
      }
      case TriggerStrategy.WEBHOOK:
        return {
          success: true,
          payload: {
            body: {},
            headers: {},
            queryParams: (request.query ?? {}) as Record<string, string>,
          },
        };
      default:
        return {
          success: false,
          message:
            'Only scheduled and webhook workflows can be triggered manually',
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Something went wrong while validating the trigger type. ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}
