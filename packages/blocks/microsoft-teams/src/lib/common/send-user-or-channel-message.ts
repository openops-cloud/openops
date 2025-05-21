import { httpClient, HttpMethod, HttpRequest } from '@openops/blocks-common';
import { AppSystemProp, system } from '@openops/server-shared';
import { ChannelOption, UserOption } from './chat-types';
import { TeamsMessageButton } from './types';

export const sendUserOrChannelMessage = async ({
  usersAndChannels,
  header,
  message,
  actions = [],
  enableActions = true,
  additionalText,
}: {
  accessToken: string;
  usersAndChannels: UserOption | ChannelOption;
  header: string;
  message?: string;
  actions: TeamsMessageButton[];
  enableActions?: boolean;
  additionalText?: string;
}) => {
  const request: HttpRequest = {
    method: HttpMethod.POST,
    url: `${system.get(
      AppSystemProp.OPENOPS_MS_TEAMS_BOT_URL,
    )}/api/request-action`,
    body: {
      type: usersAndChannels.type,
      userOrChannelId: usersAndChannels.id,
      value: {
        header,
        message,
        actions,
        enableActions,
        additionalText,
      },
    },
  };

  return await httpClient.sendRequest(request);
};
