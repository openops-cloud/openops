import { api } from '@/app/lib/api';
import { ListChatsResponse } from '@openops/shared';

export const aiAssistantChatHistoryApi = {
  list() {
    return api.get<ListChatsResponse>('/v1/ai/conversation/all-chats');
  },
  delete(chatId: string) {
    return api.delete<void>(`/v1/ai/conversation/${chatId}`);
  },
  generateName(chatId: string) {
    return api.post<{ chatName: string }>('/v1/ai/conversation/chat-name', {
      chatId,
    });
  },
  rename(chatId: string, chatName: string) {
    return api.patch<{ chatName: string }>(
      `/v1/ai/conversation/${chatId}/name`,
      {
        chatName,
      },
    );
  },
};
