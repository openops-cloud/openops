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
  UserSelection,
} from './message-interactions';
import { MessageInfo } from './message-result';
import { slackUpdateMessage } from './utils';

export interface WaitForInteractionResult {
  user: string;
  action: string | string[];
  message: MessageInfo;
  isExpired: boolean | undefined;
  userSelection: UserSelection | UserSelection[] | null;
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
    userSelection: null,
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
  const isResumedDueToUserAction = resumePayload && resumePayload.actionClicked;

  if (!isResumedDueToUserAction) {
    const updatedMessage = await messageExpired(context, messageObj);

    return {
      user: '',
      action: '',
      userSelection: null,
      isExpired: true,
      message: updatedMessage,
    };
  }

  let userSelection;
  try {
    userSelection = JSON.parse(resumePayload.actionClicked);
  } catch {
    userSelection = {
      value: resumePayload.actionClicked,
      displayText: resumePayload.actionClicked,
    };
  }

  const isResumeForActionOnThisMessage =
    actions.includes(resumePayload.actionType) ||
    actions.includes((userSelection as UserSelection)?.value);

  const isResumeForThisMessage =
    resumePayload.path === currentExecutionPath &&
    isResumeForActionOnThisMessage;

  if (!isResumeForThisMessage) {
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
      userSelection: null,
      isExpired: undefined,
      message: messageObj,
    };
  }

  const updatedMessage = await actionReceived(
    context,
    messageObj,
    userSelection,
    resumePayload.userName,
  );

  return {
    user: resumePayload.userName,
    action: Array.isArray(userSelection)
      ? userSelection.map((opt) => opt.value)
      : userSelection.value,
    message: updatedMessage,
    userSelection,
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
  userSelection: UserSelection | UserSelection[],
  userName: string,
): Promise<MessageInfo> {
  return await updateMessage(context, slackMessage, () => {
    return buildActionBlock(userName, userSelection);
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
