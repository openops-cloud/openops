import {
  BlockPropertyMap,
  StaticPropsValue,
  TriggerStrategy,
} from '@openops/blocks-framework';
import {
  ApplicationError,
  assertEqual,
  assertNotNullOrUndefined,
  AUTHENTICATION_PROPERTY_NAME,
  BlockTrigger,
  ErrorCode,
  EventPayload,
  ExecuteTriggerOperation,
  ExecuteTriggerResponse,
  ScheduleOptions,
  TriggerHookType,
} from '@openops/shared';
import { isValidCron } from 'cron-validator';
import { EngineConstants } from '../handler/context/engine-constants';
import { FlowExecutorContext } from '../handler/context/flow-execution-context';
import { createFilesService } from '../services/files.service';
import { createContextStore } from '../services/storage.service';
import { propsProcessor } from '../variables/props-processor';
import { createPropsResolver } from '../variables/props-resolver';
import { blockLoader } from './block-loader';

type Listener = {
  events: string[];
  identifierValue: string;
  identifierKey: string;
};

export const triggerHelper = {
  async executeTrigger({
    params,
    constants,
  }: ExecuteTriggerParams): Promise<ExecuteTriggerResponse<TriggerHookType>> {
    const { blockName, blockVersion, triggerName, input } = (
      params.flowVersion.trigger as BlockTrigger
    ).settings;

    assertNotNullOrUndefined(triggerName, 'triggerName is required');
    const block = await blockLoader.loadBlockOrThrow({
      blockName,
      blockVersion,
      blocksSource: constants.blocksSource,
    });
    const trigger = block.getTrigger(triggerName);

    if (trigger === undefined) {
      throw new Error(
        `trigger not found, blockName=${blockName}, triggerName=${triggerName}`,
      );
    }

    const { resolvedInput, censoredInput } = await createPropsResolver({
      apiUrl: constants.internalApiUrl,
      projectId: params.projectId,
      engineToken: params.engineToken,
    }).resolve<StaticPropsValue<BlockPropertyMap>>({
      unresolvedInput: input,
      executionState: FlowExecutorContext.empty(),
    });

    const { processedInput, errors } =
      await propsProcessor.applyProcessorsAndValidators(
        resolvedInput,
        trigger.props,
        block.auth,
        trigger.requireAuth,
      );

    if (Object.keys(errors).length > 0) {
      throw new Error(JSON.stringify(errors));
    }

    const appListeners: Listener[] = [];
    const prefix = params.test ? 'test' : '';
    let scheduleOptions: ScheduleOptions | undefined = undefined;
    const context = {
      store: createContextStore({
        apiUrl: constants.internalApiUrl,
        prefix,
        flowId: params.flowVersion.flowId,
        engineToken: params.engineToken,
        flowRunId: '',
      }),
      app: {
        createListeners({
          events,
          identifierKey,
          identifierValue,
        }: Listener): void {
          appListeners.push({ events, identifierValue, identifierKey });
        },
      },
      setSchedule(request: ScheduleOptions) {
        if (!isValidCron(request.cronExpression)) {
          throw new Error(`Invalid cron expression: ${request.cronExpression}`);
        }
        scheduleOptions = {
          cronExpression: request.cronExpression,
          timezone: request.timezone ?? 'UTC',
          failureCount: request.failureCount ?? 0,
        };
      },
      flows: {
        current: {
          id: params.flowVersion.flowId,
          version: {
            id: params.flowVersion.id,
          },
        },
      },
      webhookUrl: params.webhookUrl,
      auth: processedInput[AUTHENTICATION_PROPERTY_NAME],
      propsValue: processedInput,
      payload: params.triggerPayload ?? {},
      project: {
        id: params.projectId,
      },
    };

    switch (params.hookType) {
      case TriggerHookType.ON_DISABLE:
        await trigger.onDisable(context);
        return {};
      case TriggerHookType.ON_ENABLE:
        await trigger.onEnable(context);
        return {
          listeners: appListeners,
          scheduleOptions: isSchedulable(trigger.type)
            ? scheduleOptions
            : undefined,
        };
      case TriggerHookType.RENEW:
        assertEqual(
          trigger.type,
          TriggerStrategy.WEBHOOK,
          'triggerType',
          'WEBHOOK',
        );
        await trigger.onRenew(context);
        return {
          success: true,
        };
      case TriggerHookType.HANDSHAKE: {
        try {
          const response = await trigger.onHandshake(context);
          return {
            success: true,
            response,
          };
        } catch (e) {
          console.error(e);

          return {
            success: false,
            message: JSON.stringify(e),
          };
        }
      }
      case TriggerHookType.TEST:
        try {
          return {
            success: true,
            input: censoredInput,
            output: await trigger.test({
              ...context,
              files: createFilesService({
                apiUrl: constants.internalApiUrl,
                engineToken: params.engineToken!,
                stepName: triggerName,
                flowId: params.flowVersion.flowId,
                type: 'db',
              }),
            }),
          };
        } catch (e) {
          console.error(e);

          return {
            success: false,
            message: JSON.stringify(e),
            output: [],
            input: censoredInput,
          };
        }
      case TriggerHookType.RUN: {
        if (trigger.type === TriggerStrategy.APP_WEBHOOK) {
          if (!params.appWebhookUrl) {
            throw new Error(
              `App webhook url is not available for block name ${blockName}`,
            );
          }
          if (!params.webhookSecret) {
            throw new Error(
              `Webhook secret is not available for block name ${blockName}`,
            );
          }

          try {
            const verified = block.events?.verify({
              appWebhookUrl: params.appWebhookUrl,
              payload: params.triggerPayload as EventPayload,
              webhookSecret: params.webhookSecret,
            });

            if (verified === false) {
              console.info('Webhook is not verified');
              return {
                success: false,
                message: 'Webhook is not verified',
                output: [],
                input: resolvedInput,
              };
            }
          } catch (e) {
            console.error('Error while verifying webhook', e);
            return {
              success: false,
              message: 'Error while verifying webhook',
              output: [],
              input: resolvedInput,
            };
          }
        }

        try {
          const items = await trigger.run({
            ...context,
            files: createFilesService({
              apiUrl: constants.internalApiUrl,
              engineToken: params.engineToken!,
              flowId: params.flowVersion.flowId,
              stepName: triggerName,
              type: 'db',
            }),
          });

          if (!Array.isArray(items)) {
            throw new Error(
              `Trigger run should return an array of items, but returned ${typeof items}`,
            );
          }

          return {
            success: true,
            output: items,
            input: resolvedInput,
          };
        } catch (error) {
          if (
            error instanceof ApplicationError &&
            error.error.code === ErrorCode.EXECUTION_TIMEOUT
          ) {
            return {
              success: false,
              message: 'Engine execution time exceeded.',
            };
          }

          throw error;
        }
      }
    }
  },
};

function isSchedulable(type: TriggerStrategy): boolean {
  return type === TriggerStrategy.POLLING || type === TriggerStrategy.SCHEDULED;
}

type ExecuteTriggerParams = {
  params: ExecuteTriggerOperation<TriggerHookType>;
  constants: EngineConstants;
};
