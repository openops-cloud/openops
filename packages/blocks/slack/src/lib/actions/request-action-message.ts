import { createAction, StoreScope } from '@openops/blocks-framework';
import {
  assertNotNullOrUndefined,
  ExecutionType,
  isEmpty,
} from '@openops/shared';
import { slackAuth } from '../common/authentication';
import { getSlackIdFromPropertyInput } from '../common/get-slack-users';
import { MessageInfo } from '../common/message-result';
import {
  actions,
  headerText,
  text,
  timeoutInDays,
  username,
  usersAndChannels,
} from '../common/props';
import { slackSendMessage } from '../common/utils';
import {
  onReceivedInteraction,
  waitForInteraction,
} from '../common/wait-for-interaction';

export const requestActionMessageAction = createAction({
  auth: slackAuth,
  name: 'request_action_message',
  displayName: 'Request Action',
  description:
    'Send a message to a user or a channel and wait until an action is selected',
  props: {
    conversationId: usersAndChannels,
    headerText,
    text,
    actions,
    username,
    timeoutInDays,
  },
  async run(context) {
    if (context.executionType === ExecutionType.BEGIN) {
      const slackSendMessageResponse: MessageInfo =
        await sendMessageAskingForAction(context);

      await context.store.put(
        `slackMessage_${context.currentExecutionPath}`,
        slackSendMessageResponse,
        StoreScope.FLOW_RUN,
      );

      return await waitForInteraction(
        slackSendMessageResponse,
        context.propsValue.timeoutInDays,
        context,
        context.currentExecutionPath,
      );
    }

    const messageObj: MessageInfo | null = await context.store.get(
      `slackMessage_${context.currentExecutionPath}`,
      StoreScope.FLOW_RUN,
    );

    if (!messageObj) {
      throw new Error(
        'Could not fetch slack message from store, context.currentExecutionPath: ' +
          context.currentExecutionPath,
      );
    }

    const actions = context.propsValue.actions as {
      buttonText: string;
      buttonStyle: string;
    }[];
    const actionLabels = actions.map((action) => {
      return action.buttonText;
    });

    return await onReceivedInteraction(
      messageObj,
      actionLabels,
      context,
      context.currentExecutionPath,
    );
  },
});

const sendMessageAskingForAction = async (
  context: any,
): Promise<MessageInfo> => {
  const { actions } = context.propsValue;
  assertNotNullOrUndefined(actions, 'actions');

  if (!actions.length) {
    throw new Error(`Must have at least one button action`);
  }

  const token = context.auth.access_token;
  assertNotNullOrUndefined(token, 'token');

  const { text, username, conversationId, headerText } = context.propsValue;

  assertNotNullOrUndefined(text, 'text');
  assertNotNullOrUndefined(conversationId, 'conversationId');

  const userOrChannelId = await getSlackIdFromPropertyInput(
    token,
    conversationId,
  );

  const blocks = createMessageBlocks(headerText, text, actions);

  return await slackSendMessage({
    token,
    text,
    username,
    conversationId: userOrChannelId,
    blocks: blocks,
    eventPayload: {
      domain: context.server.publicUrl,
      isTest: context.run.isTest,
      resumeUrl: context.generateResumeUrl({
        queryParams: {
          executionCorrelationId: context.run.pauseId,
        },
      }),
    },
  });
};

interface SlackElement {
  type: string;
  text: SlackText;
  style?: string;
  confirm?: ConfirmationPrompt;
}

interface SlackText {
  type: string;
  text: string;
}

interface ConfirmationPrompt {
  title: SlackText;
  text: SlackText;
  deny: SlackText;
  confirm: SlackText;
}

function createButton(action: {
  buttonText: string;
  buttonStyle: string;
  confirmationPrompt: boolean;
  confirmationPromptText: string;
}): SlackElement {
  const {
    buttonText,
    buttonStyle,
    confirmationPrompt,
    confirmationPromptText,
  } = action;

  const button: SlackElement = {
    type: 'button',
    text: {
      type: 'plain_text',
      text: buttonText,
    },
  };

  if (buttonStyle === 'danger' || buttonStyle === 'primary') {
    button.style = buttonStyle;
  }

  if (confirmationPrompt) {
    button.confirm = createConfirmationPrompt(confirmationPromptText);
  }

  return button;
}

function createConfirmationPrompt(
  confirmationPromptText: string,
): ConfirmationPrompt {
  const defaultText = 'Are you sure?';
  const text = isEmpty(confirmationPromptText?.trim())
    ? defaultText
    : confirmationPromptText;

  return {
    deny: {
      text: 'Cancel',
      type: 'plain_text',
    },
    text: {
      text: text,
      type: 'plain_text',
    },
    title: {
      text: defaultText,
      type: 'plain_text',
    },
    confirm: {
      text: 'Confirm',
      type: 'plain_text',
    },
  };
}

function createMessageBlocks(
  headerText: string,
  messageText: string,
  actions: { buttonText: string; buttonStyle: string }[],
): any[] {
  const actionElements: SlackElement[] = actions.map((action: any) =>
    createButton(action),
  );
  const headerBlocks = [];

  if (headerText !== null && headerText.trim().length !== 0) {
    headerBlocks.push(
      ...[
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${headerText}*`,
          },
        },
        {
          type: 'divider',
        },
      ],
    );
  }

  return [
    ...headerBlocks,
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${messageText}`,
      },
    },
    {
      type: 'actions',
      block_id: 'actions',
      elements: actionElements,
    },
  ];
}
