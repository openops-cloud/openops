import { getMicrosoftGraphClient } from '@openops/common';

export async function chatExists(
  accessToken: string,
  chatId: string,
): Promise<boolean> {
  const client = getMicrosoftGraphClient(accessToken);

  try {
    await client.api(`/chats/${chatId}`).get();
    return true;
  } catch (error: unknown) {
    const graphError = error as {
      statusCode?: number;
      status?: number;
      code?: string;
      body?: { error?: { code?: string } };
    };

    if (
      graphError.statusCode === 404 ||
      graphError.status === 404 ||
      graphError.code === 'NotFound' ||
      graphError.body?.error?.code === 'NotFound'
    ) {
      return false;
    }

    throw error;
  }
}
