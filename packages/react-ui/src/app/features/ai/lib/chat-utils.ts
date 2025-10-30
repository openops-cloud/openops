import { QueryKeys } from '@/app/constants/query-keys';
import { ChatMode } from './types';

export const buildQueryKey = (
  selectedStep: string | undefined,
  flowVersionId: string | undefined,
  chatId: string | null,
  blockName: string | undefined,
  chatMode: ChatMode,
) => {
  const baseKey = [
    chatMode === ChatMode.StepSettings
      ? QueryKeys.openChat
      : QueryKeys.openAiAssistantChat,
    chatMode === ChatMode.StepSettings ? flowVersionId : chatId,
  ];

  if (selectedStep && blockName && chatMode === ChatMode.StepSettings) {
    baseKey.push(blockName);
  }

  if (selectedStep && chatMode === ChatMode.StepSettings) {
    baseKey.push(selectedStep);
  }

  return baseKey;
};
