import { StoreScope } from '@openops/blocks-framework';
import {
  InteractionPayload,
  TeamsMessageAction,
  TeamsMessageButton,
} from './generate-message-with-buttons';

export const onActionReceived = async ({
  messageObj,
  actions,
  context,
}: {
  messageObj: any;
  actions: TeamsMessageButton[];
  context: any;
}) => {
  const resumePayload = context.resumePayload
    ?.queryParams as unknown as InteractionPayload;
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
      message: messageObj,
    };
  }

  return {
    action: resumePayload.button,
    message: messageObj,
    isExpired: false,
  };
};
