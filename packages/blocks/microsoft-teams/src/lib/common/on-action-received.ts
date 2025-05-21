import { StoreScope } from '@openops/blocks-framework';
import { InteractionPayload, TeamsMessageAction } from './types';

export const onActionReceived = async ({
  actions,
  context,
}: {
  actions: TeamsMessageAction[];
  context: any;
}) => {
  const resumePayload = context.resumePayload
    ?.queryParams as unknown as InteractionPayload;
  const isResumedDueToButtonClicked = !!resumePayload?.button;

  if (!isResumedDueToButtonClicked) {
    return {
      action: '',
      isExpired: true,
    };
  }

  const isResumeForAButtonOnThisMessage =
    resumePayload?.['path'] === context.currentExecutionPath &&
    actions.find(
      (a: TeamsMessageAction) => a.buttonText === resumePayload.button,
    );

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
    };
  }

  return {
    action: resumePayload.button,
    isExpired: false,
  };
};
