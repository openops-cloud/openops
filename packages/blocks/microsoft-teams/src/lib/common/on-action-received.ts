import { StoreScope } from '@openops/blocks-framework';
import { ChannelOption, ChatOption } from './chat-types';
import {
  InteractionPayload,
  TeamsMessageAction,
  TeamsMessageButton,
} from './generate-message-with-buttons';
import { updateChatOrChannelMessage } from './update-chat-or-channel-message';

export const onActionReceived = async ({
  chatOrChannel,
  messageObj,
  header,
  message,
  actions,
  context,
}: {
  chatOrChannel: ChatOption | ChannelOption;
  messageObj: any;
  header: string;
  message: string;
  actions: TeamsMessageButton[];
  context: any;
}) => {
  const resumePayload = context.resumePayload
    ?.queryParams as unknown as InteractionPayload;
  const isResumedDueToButtonClicked = resumePayload && resumePayload.button;

  if (!isResumedDueToButtonClicked) {
    const updatedMessage = await updateChatOrChannelMessage({
      accessToken: context.auth.access_token,
      chatOrChannel,
      header,
      message,
      actions,
      enableActions: false,
      additionalText: 'The time to act on this message has expired.',
      messageId: messageObj.id,
    });

    return {
      action: '',
      isExpired: true,
      message: updatedMessage,
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

  const updatedMessage = await updateChatOrChannelMessage({
    accessToken: context.auth.access_token,
    chatOrChannel,
    header,
    message,
    actions,
    enableActions: false,
    additionalText: `Action received, "${resumePayload.button}" button was clicked!`,
    messageId: messageObj.id,
  });

  return {
    action: resumePayload.button,
    message: updatedMessage,
    isExpired: false,
  };
};
