import {
  ActionContext,
  createAction,
  Property,
} from '@openops/blocks-framework';
import { ExecutionType } from '@openops/shared';
import { getMessageButtons } from '../common/actions-search';
import { slackAuth } from '../common/authentication';
import {
  getMessageObj,
  isMessageObj,
  MessageInfo,
} from '../common/message-result';
import { timeoutInDays } from '../common/props';
import {
  onReceivedInteraction,
  waitForInteraction,
} from '../common/wait-for-interaction';

export const waitForAction = createAction({
  auth: slackAuth,
  name: 'wait_for_action',
  displayName: 'Wait For User Action',
  description: 'Wait for user action on the message.',
  props: {
    message: Property.LongText({
      displayName: 'Message',
      description: 'Slack message sent to the user.',
      required: true,
    }),

    actions: Property.MultiSelectDropdown({
      displayName: 'User Actions',
      description:
        'Actions available on the message. All buttons in the message will be listed here.',
      required: true,
      refreshers: ['message'],
      options: async ({ message }) => {
        if (!message || !isMessageObj(message)) {
          return {
            options: [],
            disabled: true,
          };
        }

        const options = getMessageButtons(message.response_body.message.blocks);

        return {
          disabled: false,
          options,
        };
      },
    }),
    timeoutInDays,
  },
  async run(context) {
    const { message, timeoutInDays, actions } = context.propsValue;
    const messageObj = getMessageObj(message);

    const currentExecutionPath = getCurrentExecutionPath(context, messageObj);

    return context.executionType === ExecutionType.BEGIN
      ? await waitForInteraction(
          messageObj,
          timeoutInDays,
          context,
          currentExecutionPath,
        )
      : await onReceivedInteraction(
          messageObj,
          actions,
          context,
          currentExecutionPath,
        );
  },
});

function getCurrentExecutionPath(
  context: ActionContext,
  messageObj: MessageInfo,
): string {
  let currentExecutionPath = context.currentExecutionPath;
  if (
    typeof messageObj?.response_body?.message?.metadata?.event_payload
      ?.resumeUrl === 'string'
  ) {
    const url = new URL(
      messageObj.response_body.message.metadata.event_payload.resumeUrl,
    );

    currentExecutionPath = url.searchParams.get('path') ?? currentExecutionPath;
  }

  return currentExecutionPath;
}
