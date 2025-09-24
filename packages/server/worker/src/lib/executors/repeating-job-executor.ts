import { TriggerStrategy } from '@openops/blocks-framework';
import {
  DelayedJobData,
  logger,
  RenewWebhookJobData,
  RepeatableJobType,
  RepeatingJobData,
  ScheduledJobData,
} from '@openops/server-shared';
import {
  assertNotNullOrUndefined,
  FlowStatus,
  FlowVersion,
  GetFlowVersionForWorkerRequestType,
  isNil,
  openOpsId,
  PopulatedFlow,
  ProgressUpdateType,
  RunEnvironment,
  TriggerPayload,
} from '@openops/shared';
import { engineApiService, workerApiService } from '../api/server-api.service';
import { triggerConsumer } from '../trigger/hooks/trigger-consumer';

export const repeatingJobExecutor = {
  executeRepeatingJob,
};

async function executeRepeatingJob({
  data,
  engineToken,
  workerToken,
}: Params): Promise<void> {
  const { flowVersionId, jobType } = data;

  const populatedFlow = await engineApiService(
    engineToken,
  ).getFlowWithExactBlocks({
    versionId: flowVersionId,
    type: GetFlowVersionForWorkerRequestType.EXACT,
  });

  const flowVersion = populatedFlow?.version ?? null;
  const isStale = await isStaleFlowVersion(populatedFlow, jobType);
  if (isStale) {
    logger.info(
      `Removing stale workflow. Provided flow version: ${flowVersionId}, Published version: ${populatedFlow?.publishedVersionId}`,
      {
        flowVersionId,
        publishedVersionId: populatedFlow?.publishedVersionId,
      },
    );
    await engineApiService(engineToken).removeStaleFlow({
      flowId: populatedFlow?.id,
      flowVersionId,
    });
    return;
  }

  if (shouldSkipDisabledFlow(data, populatedFlow)) {
    logger.info(
      {
        message: '[FlowQueueConsumer#executeRepeatingJob]',
        flowVersionId,
        publishedVersionId: populatedFlow?.publishedVersionId,
      },
      'skipping disabled flow',
    );
    return;
  }

  assertNotNullOrUndefined(flowVersion, 'flowVersion');
  switch (data.jobType) {
    case RepeatableJobType.EXECUTE_TRIGGER:
      await consumeBlockTrigger(data, flowVersion, engineToken, workerToken);
      break;
    case RepeatableJobType.DELAYED_FLOW:
      await consumeDelayedJob(data, workerToken);
      break;
    case RepeatableJobType.RENEW_WEBHOOK:
      await consumeRenewWebhookJob(data, flowVersion, engineToken);
      break;
  }
}

const isStaleFlowVersion = async (
  flow: PopulatedFlow | null,
  jobType: RepeatableJobType,
): Promise<boolean> => {
  if (isNil(flow)) {
    return true;
  }
  return (
    [
      RepeatableJobType.EXECUTE_TRIGGER,
      RepeatableJobType.RENEW_WEBHOOK,
    ].includes(jobType) && flow.publishedVersionId !== flow.version.id
  );
};

const consumeBlockTrigger = async (
  data: RepeatingJobData,
  flowVersion: FlowVersion,
  engineToken: string,
  workerToken: string,
): Promise<void> => {
  const payloads: unknown[] = await triggerConsumer.extractPayloads(
    engineToken,
    {
      projectId: data.projectId,
      flowVersion,
      payload: {} as TriggerPayload,
      simulate: false,
    },
  );

  // let executionCorrelationId = flowVersion.id;
  // if (data.triggerStrategy !== TriggerStrategy.SCHEDULED) {
  //   executionCorrelationId = openOpsId();
  // }

  logger.error('TEST:', {
    payload: payloads.length,
    data,
  });

  await workerApiService(workerToken).startRuns({
    executionCorrelationId: flowVersion.id,
    flowVersionId: data.flowVersionId,
    progressUpdateType: ProgressUpdateType.NONE,
    projectId: data.projectId,
    payloads,
  });
};

const consumeRenewWebhookJob = async (
  data: RenewWebhookJobData,
  flowVersion: FlowVersion,
  engineToken: string,
): Promise<void> => {
  logger.info(
    `[FlowQueueConsumer#consumeRenewWebhookJob] flowVersionId=${data.flowVersionId}`,
  );
  await triggerConsumer.renewWebhook({
    engineToken,
    flowVersion,
    projectId: data.projectId,
    simulate: false,
  });
};

const consumeDelayedJob = async (
  data: DelayedJobData,
  workerToken: string,
): Promise<void> => {
  logger.info(`[FlowQueueConsumer#consumeDelayedJob] flowRunId=${data.runId}`);
  await workerApiService(workerToken).resumeRun(data);
};

const shouldSkipDisabledFlow = (
  data: ScheduledJobData,
  populatedFlow: PopulatedFlow | null,
): boolean => {
  return (
    data.jobType === RepeatableJobType.EXECUTE_TRIGGER &&
    data.environment === RunEnvironment.PRODUCTION &&
    populatedFlow?.status === FlowStatus.DISABLED
  );
};

type Params = {
  data: ScheduledJobData;
  engineToken: string;
  workerToken: string;
};
