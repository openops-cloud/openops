import { getMicrosoftGraphClient } from '@openops/common';

export async function chatExists(
  accessToken: string,
  chatId: string,
): Promise<boolean> {
  const client = getMicrosoftGraphClient(accessToken);

  try {
    await client.api(`/chats/${chatId}`).get();
    return true;
  } catch {
    return false;
  }
}
