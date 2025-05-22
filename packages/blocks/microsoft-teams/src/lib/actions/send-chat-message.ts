import { createAction, Property } from '@openops/blocks-framework';
import { chatId } from '../common/chat-id';
import { getMicrosoftGraphClient } from '../common/get-microsoft-graph-client';
import { microsoftTeamsAuth } from '../common/microsoft-teams-auth';

export const sendChatMessageAction = createAction({
  auth: microsoftTeamsAuth,
  name: 'microsoft_teams_send_chat_message',
  displayName: 'Send Chat Message',
  description: 'Sends a message in an existing chat.',
  props: {
    chatId: chatId,
    contentType: Property.StaticDropdown({
      displayName: 'Content Type',
      required: true,
      defaultValue: 'text',
      options: {
        disabled: false,
        options: [
          {
            label: 'Text',
            value: 'text',
          },
          {
            label: 'HTML',
            value: 'html',
          },
        ],
      },
    }),
    content: Property.LongText({
      displayName: 'Message',
      required: true,
    }),
  },
  async run(context) {
    const { chatId, contentType, content } = context.propsValue;

    const client = getMicrosoftGraphClient(context.auth.access_token);

    const chatMessage = {
      body: {
        content: content,
        contentType: contentType,
      },
    };

    return await client.api(`/chats/${chatId}/messages`).post(chatMessage);
  },
});
