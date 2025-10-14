import { StoreScope } from '@openops/blocks-framework';

export const onActionReceived = async ({
  messageObj,
  actionLabels,
  context,
}: {
  messageObj: any;
  actionLabels: string[];
  context: any;
}) => {
  const resumePayload = context.resumePayload?.queryParams as any;
  const isResumedDueToButtonClicked = !!resumePayload?.button;

  if (!isResumedDueToButtonClicked) {
    return {
      action: '',
      isExpired: true,
      message: messageObj,
    };
  }

  const isResumeForAButtonOnThisMessage =
    resumePayload?.['path'] === context.currentExecutionPath &&
    actionLabels.includes(resumePayload.button);

  if (!isResumeForAButtonOnThisMessage) {
    const pauseMetadata = await context.store.get(
      `pauseMetadata_${context.currentExecutionPath}`,
      StoreScope.FLOW_RUN,
    );

    if (!pauseMetadata) {
      throw new Error(
        'Could not fetch pause metadata: ' + context.currentExecutionPath,
      );
    }

    context.run.pause({
      pauseMetadata: pauseMetadata,
    });

    return {
      action: '',
      isExpired: undefined,
      message: messageObj,
    };
  }

  return {
    action: resumePayload.button,
    message: messageObj,
    isExpired: false,
  };
};
