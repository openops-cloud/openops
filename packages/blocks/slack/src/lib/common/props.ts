import {
  OAuth2PropertyValue,
  Property,
  Validators,
} from '@openops/blocks-framework';
import { getSlackChannels, getSlackUsers } from './slack-api-request';

export const slackChannel = Property.Dropdown({
  displayName: 'Channel',
  description: 'Channel, private group, or IM channel to send message to.',
  required: true,
  refreshers: ['auth'],
  async options({ auth }) {
    if (!auth) {
      return noAuth();
    }

    const channels = await getChannelOptions(auth as OAuth2PropertyValue);

    return {
      disabled: false,
      placeholder: 'Select channel',
      options: channels,
    };
  },
});

export const user = Property.Dropdown<string>({
  displayName: 'User',
  description: 'Message receiver',
  required: true,
  refreshers: ['auth'],
  async options({ auth }) {
    if (!auth) {
      return noAuth();
    }

    const options = await getUserOptions(auth as OAuth2PropertyValue);

    return {
      disabled: false,
      placeholder: 'Select user',
      options: options,
    };
  },
});

export const usersAndChannels = Property.Dropdown<string>({
  displayName: 'Recipient Channel or User',
  description: 'Channel or User to send the message to.',
  required: true,
  refreshers: ['auth'],
  async options({ auth }) {
    if (!auth) {
      return noAuth();
    }

    const channelOptions = await getChannelOptions(auth as OAuth2PropertyValue);
    const userOptions = await getUserOptions(auth as OAuth2PropertyValue);

    return {
      disabled: false,
      placeholder: 'Select a channel or a user',
      options: channelOptions.concat(userOptions),
    };
  },
});

async function getUserOptions(auth: OAuth2PropertyValue): Promise<Option[]> {
  const accessToken = (auth as OAuth2PropertyValue).access_token;
  const users = await getSlackUsers(accessToken);

  const options: Option[] = users.map((user) => ({
    label: user.profile.email
      ? `${user.name} (${user.profile.email})`
      : user.name,
    value: user.id,
  }));

  return options;
}

async function getChannelOptions(auth: OAuth2PropertyValue): Promise<Option[]> {
  const accessToken = auth.access_token;
  const channels = await getSlackChannels(accessToken);

  const options: Option[] = channels.map(
    (channel: { name: string; id: string }) => ({
      label: channel.name,
      value: channel.id,
    }),
  );

  return options;
}

export const username = Property.ShortText({
  displayName: 'Username',
  description: 'Sender username',
  required: false,
});

export const blocks = Property.Json({
  displayName: 'Block Kit blocks',
  description: 'See https://api.slack.com/block-kit for specs',
  required: false,
});

export const text = Property.LongText({
  displayName: 'Message',
  description: 'The text of your message',
  required: true,
});

export const headerText = Property.LongText({
  displayName: 'Header',
  description: 'The header of your message',
  required: false,
});

export const actions = Property.Array({
  displayName: 'Action Buttons',
  required: true,
  defaultValue: [
    {
      buttonText: 'Approve',
      buttonStyle: 'primary',
      confirmationPrompt: true,
      confirmationPromptText: 'Are you sure you want to do this action?',
    },
    { buttonText: 'Dismiss', buttonStyle: 'danger', confirmationPrompt: false },
    { buttonText: 'Snooze', buttonStyle: '', confirmationPrompt: false },
  ],
  properties: {
    buttonText: Property.ShortText({
      displayName: 'Button text',
      required: true,
    }),
    buttonStyle: Property.StaticDropdown({
      displayName: 'Button color',
      required: false,
      defaultValue: '',
      options: {
        options: [
          { label: 'Transparent', value: '' },
          { label: 'Red', value: 'danger' },
          { label: 'Green', value: 'primary' },
        ],
      },
    }),
    confirmationPrompt: Property.Checkbox({
      displayName: 'Add confirmation popup',
      required: false,
      defaultValue: false,
    }),
    confirmationPromptText: Property.LongText({
      displayName: `Confirmation popup text`,
      description: '',
      required: false,
    }),
  },
});

export const timeoutInDays = Property.Number({
  displayName: 'Wait Timeout in Days',
  description: 'Number of days to wait for an action.',
  defaultValue: 3,
  required: true,
  validators: [Validators.minValue(1)],
});

export const unfurlLinksAndMedia = Property.Checkbox({
  displayName: 'Unfurl links and media',
  description: 'When enabled, Slack will automatically expand links and show media previews in the message. Disable to prevent link and media unfurling.',
  required: false,
  defaultValue: true,
});

interface Option {
  label: string;
  value: string;
}

function noAuth() {
  return {
    disabled: true,
    placeholder: 'connect slack account',
    options: [],
  };
}
