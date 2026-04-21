import { getMicrosoftGraphClient } from '@openops/common';

export function isEmail(value: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const teamsThreadPattern = /@thread\.(v2|tacv2|skype)$/;
  const teamsChatIdPattern = /^19:[a-zA-Z0-9_-]+@/;

  if (teamsThreadPattern.test(value) || teamsChatIdPattern.test(value)) {
    return false;
  }

  return emailPattern.test(value);
}

export async function createOrGetUserChat(
  accessToken: string,
  userIdOrEmail: string,
): Promise<string> {
  const client = getMicrosoftGraphClient(accessToken);

  const me = await client.api('/me').get();
  const myUserId = me.id;

  let targetUserId = userIdOrEmail;
  if (isEmail(userIdOrEmail)) {
    const escapedEmail = userIdOrEmail.replace(/'/g, "''");
    try {
      const userResponse = await client
        .api('/users')
        .filter(
          `mail eq '${escapedEmail}' or userPrincipalName eq '${escapedEmail}'`,
        )
        .get();

      if (!userResponse.value || userResponse.value.length === 0) {
        throw new Error(`User not found: ${userIdOrEmail}`);
      }

      targetUserId = userResponse.value[0].id;
    } catch (error: unknown) {
      const graphError = error as { statusCode?: number; message?: string };
      if (graphError.statusCode === 403) {
        throw new Error(
          `Insufficient permissions to resolve email. Please add 'User.ReadBasic.All' scope and re-authenticate.`,
        );
      }
      throw error;
    }
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

  try {
    const chat = await client.api('/chats').post(chatPayload);
    return chat.id;
  } catch (error: unknown) {
    const graphError = error as { statusCode?: number; message?: string };
    if (graphError.statusCode === 403) {
      throw new Error(
        `Insufficient permissions to create chat. Please add 'Chat.Create' scope and re-authenticate.`,
      );
    }
    throw error;
  }
}
