import { api } from '@/app/lib/api';
import { OpenChatResponse } from '@openops/shared';

export const aiChatApi = {
  open(
    workflowId: string,
    blockName: string,
    stepId: string,
    actionName: string,
  ) {
    return api.post<OpenChatResponse>('/v1/ai/conversation/open', {
      workflowId,
      blockName,
      stepId,
      actionName,
    });
  },
  delete(chatId: string) {
    return api.delete<void>(`/v1/ai/conversation/${chatId}`);
  },
};
