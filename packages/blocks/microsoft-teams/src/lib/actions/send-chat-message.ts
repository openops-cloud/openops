import { createAction, Property } from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from '@openops/common';
import { chatExists } from '../common/chat-exists';
import { chatId } from '../common/chat-id';
import {
  createOrGetUserChat,
  isEmail,
} from '../common/create-or-get-user-chat';
import { microsoftTeamsAuth } from '../common/microsoft-teams-auth';

export const sendChatMessageAction = createAction({
  auth: microsoftTeamsAuth,
  name: 'microsoft_teams_send_chat_message',
  displayName: 'Send Chat Message',
  description: 'Sends a message in an existing chat.',
  isWriteAction: true,
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

    let finalChatId = chatId;

    if (isEmail(chatId)) {
      finalChatId = await createOrGetUserChat(
        context.auth.access_token,
        chatId,
      );
    } else {
      const exists = await chatExists(context.auth.access_token, chatId);
      if (!exists) {
        finalChatId = await createOrGetUserChat(
          context.auth.access_token,
          chatId,
        );
      }
    }

    const client = getMicrosoftGraphClient(context.auth.access_token);

    const chatMessage = {
      body: {
        content: content,
        contentType: contentType,
      },
    };

    return await client.api(`/chats/${finalChatId}/messages`).post(chatMessage);
  },
});
