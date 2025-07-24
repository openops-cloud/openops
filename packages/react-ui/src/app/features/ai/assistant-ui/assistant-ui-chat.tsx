import { useTheme } from '@/app/common/providers/theme-provider';
import { useAiModelSelector } from '@/app/features/ai/lib/ai-model-selector-hook';
import { useAssistantChat } from '@/app/features/ai/lib/assistant-ui-chat-hook';
import { AssistantUiChatContainer } from '@openops/components/ui';
import { t } from 'i18next';
import { ReactNode } from 'react';

type AssistantUiChatProps = {
  onClose: () => void;
  title?: string;
  children?: ReactNode;
};

const AssistantUiChat = ({
  onClose,
  children,
  title,
}: AssistantUiChatProps) => {
  const {
    runtime,
    shouldRenderChat,
    openChatResponse,
    isLoading,
    hasMessages,
    createNewChat,
  } = useAssistantChat();

  const { theme } = useTheme();

  const {
    selectedModel,
    availableModels,
    onModelSelected,
    isLoading: isModelSelectorLoading,
  } = useAiModelSelector();

  if (isLoading || !openChatResponse) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">
          {t('Loading chat...')}
        </div>
      </div>
    );
  }

  if (!shouldRenderChat) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">
          {t('Initializing chat...')}
        </div>
      </div>
    );
  }

  return (
    <AssistantUiChatContainer
      onClose={onClose}
      runtime={runtime}
      onNewChat={createNewChat}
      title={title}
      enableNewChat={hasMessages}
      availableModels={availableModels}
      onModelSelected={onModelSelected}
      isModelSelectorLoading={isModelSelectorLoading}
      selectedModel={selectedModel}
      theme={theme}
    >
      {children}
    </AssistantUiChatContainer>
  );
};

export default AssistantUiChat;
