import { api } from '@/app/lib/api';
import { OpenChatResponse } from '@openops/shared';

export const aiChatApi = {
  open(workflowId: string, blockName: string, stepName: string) {
    return api.post<OpenChatResponse>('/v1/ai/chat/open', {
      workflowId,
      blockName,
      stepName,
    });
  },
};
