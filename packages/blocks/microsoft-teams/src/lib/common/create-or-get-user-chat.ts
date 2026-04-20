import { getMicrosoftGraphClient } from '@openops/common';

export async function createOrGetUserChat(
  accessToken: string,
  userIdOrEmail: string,
): Promise<string> {
  const client = getMicrosoftGraphClient(accessToken);

  const me = await client.api('/me').get();
  const myUserId = me.id;

  let targetUserId = userIdOrEmail;
  if (userIdOrEmail.includes('@')) {
    const userResponse = await client
      .api('/users')
      .filter(
        `mail eq '${userIdOrEmail}' or userPrincipalName eq '${userIdOrEmail}'`,
      )
      .get();

    if (!userResponse.value || userResponse.value.length === 0) {
      throw new Error(`User not found: ${userIdOrEmail}`);
    }

    targetUserId = userResponse.value[0].id;
  }

  const chatsResponse = await client
    .api('/me/chats')
    .filter(`chatType eq 'oneOnOne'`)
    .expand('members')
    .get();

  const existingChat = chatsResponse.value.find(
    (chat: { members: { userId: string }[] }) => {
      return chat.members.some(
        (member: { userId: string }) =>
          member.userId === targetUserId && member.userId !== myUserId,
      );
    },
  );

  if (existingChat) {
    return existingChat.id;
  }

  const chatPayload = {
    chatType: 'oneOnOne',
    members: [
      {
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': `https://graph.microsoft.com/v1.0/users/${myUserId}`,
      },
      {
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': `https://graph.microsoft.com/v1.0/users/${targetUserId}`,
      },
    ],
  };

  const chat = await client.api('/chats').post(chatPayload);

  return chat.id;
}
