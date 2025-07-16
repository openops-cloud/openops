import { AiAssistantConversation } from '@/app/features/ai/ai-assistant-conversation';
import { useAiAssistantChat } from '@/app/features/ai/lib/ai-assistant-chat-hook';
import { useAiModelSelector } from '@/app/features/ai/lib/ai-model-selector-hook';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { useAppStore } from '@/app/store/app-store';
import {
  AiAssistantBuilderChatContainer,
  cn,
  NoAiEnabledPopover,
} from '@openops/components/ui';
import { useRef } from 'react';

type AiAssistantBuilderChatProps = {
  className?: string;
};

const AiAssistantBuilderChat = ({ className }: AiAssistantBuilderChatProps) => {
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageRef = useRef<HTMLDivElement>(null);
  const { isAiChatOpened, setIsAiChatOpened } = useAppStore((s) => ({
    isAiChatOpened: s.isAiChatOpened,
    setIsAiChatOpened: s.setIsAiChatOpened,
  }));

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    createNewChat,
    isOpenAiChatPending,
  } = useAiAssistantChat();

  const {
    selectedModel,
    availableModels,
    onModelSelected,
    isLoading: isModelSelectorLoading,
  } = useAiModelSelector();

  const { hasActiveAiSettings, isLoading } =
    aiSettingsHooks.useHasActiveAiSettings();

  if (isLoading) {
    return null;
  }

  if (!hasActiveAiSettings && isAiChatOpened) {
    return (
      <NoAiEnabledPopover
        className={cn('absolute left-4 bottom-[17px] z-50', className)}
        onCloseClick={() => setIsAiChatOpened(false)}
      />
    );
  }

  return (
    <AiAssistantBuilderChatContainer
      showAiChat={isAiChatOpened}
      onCloseClick={() => setIsAiChatOpened(false)}
      className={cn(className)}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      input={input}
      isEmpty={!messages?.length}
      onCreateNewChatClick={createNewChat}
      availableModels={availableModels}
      selectedModel={selectedModel}
      isModelSelectorLoading={isModelSelectorLoading}
      onModelSelected={onModelSelected}
      messages={messages.map((m, idx) => ({
        id: m.id ?? String(idx),
        role: m.role,
      }))}
      status={status}
      lastUserMessageRef={lastUserMessageRef}
      lastAssistantMessageRef={lastAssistantMessageRef}
    >
      <AiAssistantConversation
        messages={messages}
        status={status}
        isPending={isOpenAiChatPending}
        lastUserMessageRef={lastUserMessageRef}
        lastAssistantMessageRef={lastAssistantMessageRef}
      />
    </AiAssistantBuilderChatContainer>
  );
};

AiAssistantBuilderChat.displayName = 'AiAssistantBuilderChat';
export { AiAssistantBuilderChat };
