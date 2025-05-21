import {
  createAction,
  Property,
  StoreScope,
  Validators,
} from '@openops/blocks-framework';
import { ExecutionType } from '@openops/shared';
import { ChannelOption, UserOption } from '../common/chat-types';
import { microsoftTeamsAuth } from '../common/microsoft-teams-auth';
import { onActionReceived } from '../common/on-action-received';
import { sendUserOrChannelMessage } from '../common/send-user-or-channel-message';
import { TeamsMessageAction, TeamsMessageButton } from '../common/types';
import { usersAndChannels } from '../common/users-and-channels';
import { waitForInteraction } from '../common/wait-for-interaction';

export const requestActionMessageAction = createAction({
  auth: microsoftTeamsAuth,
  name: 'microsoft_teams_request_action_message',
  displayName: 'Request Action',
  description:
    'Send a message to a user or a channel and wait until an action is selected',
  props: {
    usersAndChannels: usersAndChannels,
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
          displayName: 'Button type',
          required: true,
          defaultValue: 'default',
          options: {
            options: [
              { label: 'Positive', value: 'positive' },
              { label: 'Destructive', value: 'destructive' },
              { label: 'Default', value: 'default' },
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
    const { usersAndChannels, header, message, actions } =
      context.propsValue as unknown as {
        usersAndChannels: UserOption | ChannelOption;
        header: string;
        message: string;
        actions: TeamsMessageAction[];
      };
    if (context.executionType === ExecutionType.BEGIN) {
      const preparedActions: TeamsMessageButton[] = actions.map((action) => ({
        ...action,
        type: 'Action.Submit',
        resumeUrl: context.generateResumeUrl({
          queryParams: {
            executionCorrelationId: context.run.pauseId,
            button: action.buttonText,
          },
        }),
      }));

      const result = await sendUserOrChannelMessage({
        accessToken: context.auth.access_token,
        usersAndChannels,
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
      actions,
      context,
    });
  },
});
