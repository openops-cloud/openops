import {
  ActionContext,
  ResumeExecutionActionContext,
  StoreScope,
} from '@openops/blocks-framework';
import { PauseMetadata } from '@openops/shared';
import {
  buildActionBlock,
  buildExpiredMessageBlock,
  InteractionPayload,
  removeActionBlocks,
} from '../common/message-interactions';
import { slackUpdateMessage } from '../common/utils';
import { MessageInfo } from './message-result';

export interface WaitForInteractionResult {
  user: string;
  action: string;
  message: MessageInfo;
  isExpired: boolean | undefined;
}

export async function waitForInteraction(
  messageObj: MessageInfo,
  timeoutInDays: number,
  context: ActionContext,
  currentExecutionPath: string,
): Promise<WaitForInteractionResult> {
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
  pauseFlow(context, pauseMetadata);

  return {
    user: '',
    action: '',
    isExpired: undefined,
    message: messageObj,
  };
}

export async function onReceivedInteraction(
  messageObj: MessageInfo,
  actions: string[],
  context: ResumeExecutionActionContext,
  currentExecutionPath: string,
): Promise<WaitForInteractionResult> {
  const resumePayload = context.resumePayload
    ?.queryParams as unknown as InteractionPayload;
  const isResumedDueToButtonClicked =
    resumePayload && resumePayload.actionClicked;

  if (!isResumedDueToButtonClicked) {
    const updatedMessage = await messageExpired(context, messageObj);

    return {
      user: '',
      action: '',
      isExpired: true,
      message: updatedMessage,
    };
  }

  const isResumeForAButtonOnThisMessage =
    resumePayload.path === currentExecutionPath &&
    actions.includes(resumePayload.actionClicked);

  if (!isResumeForAButtonOnThisMessage) {
    const pauseMetadata = await context.store.get(
      `pauseMetadata_${currentExecutionPath}`,
      StoreScope.FLOW_RUN,
    );

    if (!pauseMetadata) {
      throw new Error(
        'Could not fetch pause metadata: ' + currentExecutionPath,
      );
    }

    pauseFlow(context, pauseMetadata);

    return {
      user: '',
      action: '',
      isExpired: undefined,
      message: messageObj,
    };
  }

  const updatedMessage = await actionReceived(
    context,
    messageObj,
    resumePayload.actionClicked,
    resumePayload.userName,
  );

  return {
    user: resumePayload.userName,
    action: resumePayload.actionClicked,
    message: updatedMessage,
    isExpired: false,
  };
}

function pauseFlow(context: ActionContext, pauseMetadata: PauseMetadata) {
  context.run.pause({
    pauseMetadata: pauseMetadata,
  });
}

async function updateMessage(
  context: any,
  slackMessage: MessageInfo,
  addMessageBlock: () => any[],
): Promise<MessageInfo> {
  const cleanedBlocks = removeActionBlocks(
    slackMessage.response_body.message.blocks,
  );

  const modifiedMessageBlocks = [...cleanedBlocks, ...addMessageBlock()];

  return await slackUpdateMessage({
    token: context.auth.access_token,
    conversationId: slackMessage.response_body.channel,
    blocks: modifiedMessageBlocks,
    text: '',
    messageTimestamp: slackMessage.response_body.ts,
    metadata: {
      event_payload: {
        ...slackMessage.response_body.message.metadata.event_payload,
        messageDisabled: true,
      },
      event_type: 'slack-message',
    },
  });
}

async function actionReceived(
  context: ActionContext,
  slackMessage: MessageInfo,
  actionText: string,
  userName: string,
): Promise<MessageInfo> {
  return await updateMessage(context, slackMessage, () => {
    return buildActionBlock(userName, actionText);
  });
}

async function messageExpired(
  context: ActionContext,
  slackMessage: MessageInfo,
): Promise<MessageInfo> {
  return await updateMessage(context, slackMessage, () => {
    return buildExpiredMessageBlock();
  });
}
