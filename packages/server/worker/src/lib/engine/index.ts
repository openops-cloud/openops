import {
  logger,
  networkUtls,
  webhookSecretsUtils,
} from '@openops/server-shared';
import {
  EngineOperationType,
  ExecuteExtractBlockMetadata,
  ExecuteFlowOperation,
  ExecutePropsOptions,
  ExecuteStepOperation,
  ExecuteTriggerOperation,
  ExecuteValidateAuthOperation,
  TriggerHookType,
} from '@openops/shared';
import { webhookUtils } from '../utils/webhook-utils';
import { callEngineLambda } from './call-engine';
import { EngineRunner } from './engine-runner';
import { blockEngineUtil } from './flow-enginer-util';

export const engineRunner: EngineRunner = {
  async executeFlow(engineToken, operation) {
    const input: ExecuteFlowOperation = {
      ...operation,
      engineToken,
      publicUrl: await networkUtls.getPublicUrl(),
      internalApiUrl: networkUtls.getInternalApiUrl(),
    };

    return callEngineLambda(EngineOperationType.EXECUTE_FLOW, input);
  },

  async extractBlockMetadata(operation: ExecuteExtractBlockMetadata) {
    return callEngineLambda(
      EngineOperationType.EXTRACT_BLOCK_METADATA,
      operation,
    );
  },

  async executeTrigger(engineToken, operation) {
    logger.debug(
      { hookType: operation.hookType, projectId: operation.projectId },
      '[EngineHelper#executeTrigger]',
    );

    const triggerBlock = await blockEngineUtil.getTriggerBlock(
      engineToken,
      operation.flowVersion,
    );
    const lockedVersion = await blockEngineUtil.lockBlockInFlowVersion({
      engineToken,
      stepName: operation.flowVersion.trigger.name,
      flowVersion: operation.flowVersion,
    });

    const input: ExecuteTriggerOperation<TriggerHookType> = {
      projectId: operation.projectId,
      hookType: operation.hookType,
      webhookUrl: operation.webhookUrl,
      test: operation.test,
      triggerPayload: operation.triggerPayload,
      flowVersion: lockedVersion,
      appWebhookUrl: await webhookUtils.getAppWebhookUrl({
        appName: triggerBlock.blockName,
      }),
      publicUrl: await networkUtls.getPublicUrl(),
      internalApiUrl: networkUtls.getInternalApiUrl(),
      webhookSecret: await webhookSecretsUtils.getWebhookSecret(lockedVersion),
      engineToken,
    };

    return callEngineLambda(EngineOperationType.EXECUTE_TRIGGER_HOOK, input);
  },

  async executeProp(engineToken, operation) {
    const input: ExecutePropsOptions = {
      ...operation,
      publicUrl: await networkUtls.getPublicUrl(),
      internalApiUrl: networkUtls.getInternalApiUrl(),
      engineToken,
    };

    return callEngineLambda(EngineOperationType.EXECUTE_PROPERTY, input);
  },

  async executeValidateAuth(engineToken, operation) {
    const input: ExecuteValidateAuthOperation = {
      ...operation,
      publicUrl: await networkUtls.getPublicUrl(),
      internalApiUrl: networkUtls.getInternalApiUrl(),
      engineToken,
    };

    return callEngineLambda(EngineOperationType.EXECUTE_VALIDATE_AUTH, input);
  },

  async executeAction(engineToken, operation) {
    const lockedFlowVersion = await blockEngineUtil.lockBlockInFlowVersion({
      engineToken,
      flowVersion: operation.flowVersion,
      stepName: operation.stepName,
    });

    const input: ExecuteStepOperation = {
      flowVersion: lockedFlowVersion,
      stepName: operation.stepName,
      projectId: operation.projectId,
      publicUrl: await networkUtls.getPublicUrl(),
      internalApiUrl: networkUtls.getInternalApiUrl(),
      engineToken,
      stepTestOutputs: operation.stepTestOutputs,
    };

    return callEngineLambda(EngineOperationType.EXECUTE_STEP, input);
  },
};
