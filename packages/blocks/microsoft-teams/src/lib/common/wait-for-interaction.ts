import { ActionContext, StoreScope } from '@openops/blocks-framework';

export const waitForInteraction = async (
  messageObj: any,
  timeoutInDays: number,
  context: ActionContext,
  currentExecutionPath: string,
) => {
  const messageExpiryDateInUtc = new Date(
    Date.now() + timeoutInDays * 24 * 60 * 60 * 1000,
  );

  const pauseMetadata = {
    executionCorrelationId: context.run.pauseId,
    resumeDateTime: messageExpiryDateInUtc.toString(),
  };

  await context.store.put(
    `pauseMetadata_${currentExecutionPath}`,
    pauseMetadata,
    StoreScope.FLOW_RUN,
  );
  context.run.pause({
    pauseMetadata: pauseMetadata,
  });

  return {
    action: '',
    isExpired: undefined,
    message: messageObj,
  };
};
