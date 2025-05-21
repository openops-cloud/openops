import {
  ApplicationError,
  BlockTrigger,
  Cursor,
  ErrorCode,
  FlowId,
  getBlockMajorAndMinorVersion,
  openOpsId,
  PopulatedFlow,
  ProjectId,
  sanitizeObjectForPostgresql,
  SeekPage,
  Trigger,
  TriggerEvent,
  TriggerHookType,
  TriggerType,
} from '@openops/shared';
import dayjs from 'dayjs';
import { engineRunner, webhookUtils } from 'server-worker';
import { LessThan } from 'typeorm';
import { accessTokenManager } from '../../authentication/lib/access-token-manager';
import { repoFactory } from '../../core/db/repo-factory';
import { buildPaginator } from '../../helper/pagination/build-paginator';
import { paginationHelper } from '../../helper/pagination/pagination-utils';
import { Order } from '../../helper/pagination/paginator';
import { flowService } from '../flow/flow.service';
import { flowStepTestOutputService } from '../step-test-output/flow-step-test-output.service';
import { TriggerEventEntity } from './trigger-event.entity';

export const triggerEventRepo = repoFactory(TriggerEventEntity);

export const triggerEventService = {
  async saveEvent({
    projectId,
    flowId,
    payload,
  }: {
    projectId: ProjectId;
    flowId: FlowId;
    payload: unknown;
  }): Promise<TriggerEvent> {
    const flow = await flowService.getOnePopulatedOrThrow({
      id: flowId,
      projectId,
    });

    const sourceName = getSourceName(flow.version.trigger);

    const triggerEventToSave = {
      id: openOpsId(),
      projectId,
      flowId: flow.id,
      sourceName,
      payload: sanitizeObjectForPostgresql(payload),
    };

    if (flow.version.trigger.id) {
      await flowStepTestOutputService.save({
        stepId: flow.version.trigger.id,
        flowVersionId: flow.version.id,
        output: triggerEventToSave.payload,
      });
    }

    return triggerEventRepo().save(triggerEventToSave);
  },

  async test({
    projectId,
    flow,
  }: {
    projectId: ProjectId;
    flow: PopulatedFlow;
  }): Promise<SeekPage<unknown>> {
    const trigger = flow.version.trigger;
    const emptyPage = paginationHelper.createPage<TriggerEvent>([], null);
    switch (trigger.type) {
      case TriggerType.BLOCK: {
        const engineToken = await accessTokenManager.generateEngineToken({
          projectId,
        });
        const { result: testResult } = await engineRunner.executeTrigger(
          engineToken,
          {
            hookType: TriggerHookType.TEST,
            flowVersion: flow.version,
            webhookUrl: await webhookUtils.getWebhookUrl({
              flowId: flow.id,
              simulate: true,
            }),
            test: true,
            projectId,
          },
        );
        await triggerEventRepo().delete({
          projectId,
          flowId: flow.id,
        });
        if (!testResult.success) {
          throw new ApplicationError({
            code: ErrorCode.TEST_TRIGGER_FAILED,
            params: {
              message: testResult.message!,
            },
          });
        }

        for (const output of testResult.output) {
          await triggerEventService.saveEvent({
            projectId,
            flowId: flow.id,
            payload: output,
          });
        }

        return triggerEventService.list({
          projectId,
          flow,
          cursor: null,
          limit: testResult.output.length,
        });
      }
      case TriggerType.EMPTY:
        return emptyPage;
    }
  },

  async list({
    projectId,
    flow,
    cursor,
    limit,
  }: ListParams): Promise<SeekPage<TriggerEvent>> {
    const decodedCursor = paginationHelper.decodeCursor(cursor);
    const sourceName = getSourceName(flow.version.trigger);
    const flowId = flow.id;
    const paginator = buildPaginator({
      entity: TriggerEventEntity,
      query: {
        limit,
        order: Order.DESC,
        afterCursor: decodedCursor.nextCursor,
        beforeCursor: decodedCursor.previousCursor,
      },
    });
    const query = triggerEventRepo().createQueryBuilder('trigger_event').where({
      projectId,
      flowId,
      sourceName,
    });
    const { data, cursor: newCursor } = await paginator.paginate(query);
    return paginationHelper.createPage<TriggerEvent>(data, newCursor);
  },
  async deleteEventsOlderThanFourteenDay(): Promise<void> {
    const fourteenDayAgo = dayjs().subtract(14, 'day').toDate();
    await triggerEventRepo().delete({
      created: LessThan(fourteenDayAgo.toISOString()),
    });
  },
};

function getSourceName(trigger: Trigger): string {
  switch (trigger.type) {
    case TriggerType.BLOCK: {
      const blockTrigger = trigger as BlockTrigger;
      const blockName = blockTrigger.settings.blockName;
      const blockVersion = getBlockMajorAndMinorVersion(
        blockTrigger.settings.blockVersion,
      );
      const triggerName = blockTrigger.settings.triggerName;
      return `${blockName}@${blockVersion}:${triggerName}`;
    }

    case TriggerType.EMPTY:
      return trigger.type;
  }
}

type ListParams = {
  projectId: ProjectId;
  flow: PopulatedFlow;
  cursor: Cursor | null;
  limit: number;
};
