import { ChannelOption, ChatOption, ChatTypes } from './chat-types';
import {
  generateMessageWithButtons,
  TeamsMessageButton,
} from './generate-message-with-buttons';
import { getMicrosoftGraphClient } from './get-microsoft-graph-client';

export const sendChatOrChannelMessage = async ({
  accessToken,
  chatOrChannel,
  header,
  message,
  actions = [],
  enableActions = true,
  additionalText,
}: {
  accessToken: string;
  chatOrChannel: ChatOption | ChannelOption;
  header: string;
  message?: string;
  actions: TeamsMessageButton[];
  enableActions?: boolean;
  additionalText?: string;
}) => {
  const client = getMicrosoftGraphClient(accessToken);

  const messagePayload = generateMessageWithButtons({
    header,
    message,
    actions,
    enableActions,
    additionalText,
  });

  if (chatOrChannel.type === ChatTypes.CHAT) {
    return await client
      .api(`/chats/${chatOrChannel.id}/messages`)
      .post(messagePayload);
  }
  return await client
    .api(`/teams/${chatOrChannel.teamId}/channels/${chatOrChannel.id}/messages`)
    .post(messagePayload);
};
