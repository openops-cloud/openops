import { PageCollection } from '@microsoft/microsoft-graph-client';
import { Chat, ConversationMember } from '@microsoft/microsoft-graph-types';
import {
  DropdownOption,
  OAuth2PropertyValue,
  OAuth2Props,
} from '@openops/blocks-framework';
import { ChatOption, ChatTypes } from './chat-types';
import { getMicrosoftGraphClient } from './get-microsoft-graph-client';
import { parseMsPaginatedData } from './parse-ms-paginated-data';

export async function getAllChatOptions(
  auth: OAuth2PropertyValue<OAuth2Props>,
): Promise<DropdownOption<ChatOption>[]> {
  const options: DropdownOption<ChatOption>[] = [];
  const client = getMicrosoftGraphClient(auth.access_token);

  // Pagination : https://learn.microsoft.com/en-us/graph/sdks/paging?view=graph-rest-1.0&tabs=typescript#manually-requesting-subsequent-pages
  // List Chats : https://learn.microsoft.com/en-us/graph/api/chat-list?view=graph-rest-1.0&tabs=http
  const response: PageCollection = await client
    .api('/chats')
    .expand('members')
    .get();

  await parseMsPaginatedData(client, response, options, populateChatOptions);

  return options;
}

const CHAT_TYPE = {
  oneOnOne: '1 : 1',
  group: 'Group',
  meeting: 'Meeting',
  unknownFutureValue: 'Unknown',
};

async function populateChatOptions(
  options: DropdownOption<ChatOption>[],
  elem: Chat,
) {
  const chatName =
    elem.topic ??
    elem.members
      ?.filter((member: ConversationMember) => member.displayName)
      .map((member: ConversationMember) => member.displayName)
      .join(',');

  options.push({
    label: `(${CHAT_TYPE[elem.chatType!]} Chat) ${chatName || '(no title)'}`,
    value: {
      id: elem.id!,
      type: ChatTypes.CHAT,
    },
  });
}
