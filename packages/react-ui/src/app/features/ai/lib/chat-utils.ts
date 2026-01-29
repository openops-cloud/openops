import { QueryKeys } from '@/app/constants/query-keys';
import { UI_TOOL_PREFIX } from '@openops/shared';
import { UIMessage } from 'ai';
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

export function hasCompletedUIToolCalls(messages: UIMessage[]): boolean {
  const message = messages[messages.length - 1];

  if (!message || message.role !== 'assistant') {
    return false;
  }

  const lastStepStartIndex = message.parts.reduce(
    (lastIndex, part, index) =>
      part.type === 'step-start' ? index : lastIndex,
    -1,
  );

  const lastStepParts = message.parts.slice(lastStepStartIndex + 1);

  const uiToolParts = lastStepParts.filter((part) => {
    const isStaticUITool = part.type.startsWith(`tool-${UI_TOOL_PREFIX}`);
    const isDynamicUITool =
      part.type === 'dynamic-tool' &&
      (part as { toolName?: string }).toolName?.startsWith(UI_TOOL_PREFIX);
    return isStaticUITool || isDynamicUITool;
  });

  return (
    uiToolParts.length > 0 &&
    uiToolParts.every((part) => {
      const state = (part as { state?: string }).state;
      return state === 'output-available' || state === 'output-error';
    })
  );
}
