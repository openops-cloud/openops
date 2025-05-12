import { api } from '@/app/lib/api';
import { OpenChatResponse } from '@openops/shared';

export const aiChatApi = {
  open(
    workflowId: string,
    blockName: string,
    stepName: string,
    actionName: string,
  ) {
    return api.post<OpenChatResponse>('/v1/ai/chat/open', {
      workflowId,
      blockName,
      stepName,
      actionName,
    });
  },
  delete(chatId: string) {
    return api.delete<void>(`/v1/ai/chat/conversation/${chatId}`);
  },
};
