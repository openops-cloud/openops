import {
  createAction,
  Property,
  StoreScope,
  Validators,
} from '@openops/blocks-framework';
import { networkUtls } from '@openops/server-shared';
import { ExecutionType } from '@openops/shared';
import { ChannelOption, ChatOption } from '../common/chat-types';
import { chatsAndChannels } from '../common/chats-and-channels';
import {
  TeamsMessageAction,
  TeamsMessageButton,
} from '../common/generate-message-with-buttons';
import { microsoftTeamsAuth } from '../common/microsoft-teams-auth';
import { onActionReceived } from '../common/on-action-received';
import { sendChatOrChannelMessage } from '../common/send-chat-or-channel-message';
import { waitForInteraction } from '../common/wait-for-interaction';

export const requestActionMessageAction = createAction({
  auth: microsoftTeamsAuth,
  name: 'microsoft_teams_request_action_message',
  displayName: 'Request Action',
  description:
    'Send a message to a user or a channel and wait until an action is selected',
  props: {
    chatOrChannel: chatsAndChannels,
    header: Property.ShortText({
      displayName: 'Header',
      required: true,
    }),
    message: Property.ShortText({
      displayName: 'Message',
      required: false,
    }),
    actions: Property.Array({
      displayName: 'Action Buttons',
      required: true,
      validators: [Validators.maxArrayLength(6)],
      defaultValue: [
        {
          buttonText: 'Approve',
          buttonStyle: 'positive',
        },
        { buttonText: 'Dismiss', buttonStyle: 'destructive' },
        { buttonText: 'Snooze', buttonStyle: 'default' },
      ],
      properties: {
        buttonText: Property.ShortText({
          displayName: 'Button text',
          required: true,
        }),
        buttonStyle: Property.StaticDropdown({
          displayName: 'Button color',
          required: true,
          defaultValue: 'default',
          options: {
            options: [
              { label: 'Blue', value: 'positive' },
              { label: 'Red', value: 'destructive' },
              { label: 'Transparent', value: 'default' },
            ],
          },
        }),
      },
    }),
    timeoutInDays: Property.Number({
      displayName: 'Wait Timeout in Days',
      description: 'Number of days to wait for an action.',
      defaultValue: 3,
      required: true,
      validators: [Validators.minValue(1)],
    }),
  },
  async run(context) {
    const { chatOrChannel, header, message, actions } =
      context.propsValue as unknown as {
        chatOrChannel: ChatOption | ChannelOption;
        header: string;
        message: string;
        actions: TeamsMessageAction[];
      };
    if (context.executionType === ExecutionType.BEGIN) {
      const baseUrl = await networkUtls.getPublicUrl();

      const preparedActions: TeamsMessageButton[] = actions.map((action) => ({
        ...action,
        resumeUrl: context.run.isTest
          ? 'https://static.openops.com/test_teams_actions.txt'
          : context.generateResumeUrl(
              {
                queryParams: {
                  executionCorrelationId: context.run.pauseId,
                  button: action.buttonText,
                },
              },
              baseUrl,
            ),
      }));

      const result = await sendChatOrChannelMessage({
        accessToken: context.auth.access_token,
        chatOrChannel,
        header,
        message,
        actions: preparedActions,
      });

      await context.store.put(
        `teamsMessage_${context.currentExecutionPath}`,
        result,
        StoreScope.FLOW_RUN,
      );

      return await waitForInteraction(
        result,
        context.propsValue.timeoutInDays,
        context,
        context.currentExecutionPath,
      );
    }

    const messageObj: any = await context.store.get(
      `teamsMessage_${context.currentExecutionPath}`,
      StoreScope.FLOW_RUN,
    );

    if (!messageObj) {
      throw new Error(
        'Could not fetch teams message from store, context.currentExecutionPath: ' +
          context.currentExecutionPath,
      );
    }

    return await onActionReceived({
      messageObj,
      actions,
      context,
    });
  },
});
