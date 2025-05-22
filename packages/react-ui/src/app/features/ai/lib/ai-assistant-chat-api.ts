import { api } from '@/app/lib/api';
import { OpenChatResponse } from '@openops/shared';

export const aiAssistantChatApi = {
  open(chatId?: string | null) {
    return api.post<OpenChatResponse>('/v1/ai/conversation/open', {
      chatId,
    });
  },
  delete(chatId: string) {
    return api.delete<void>(`/v1/ai/conversation/${chatId}`);
  },
};
