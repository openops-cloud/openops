import { useTheme } from '@/app/common/providers/theme-provider';
import { useAiModelSelector } from '@/app/features/ai/lib/ai-model-selector-hook';
import { useAssistantChat } from '@/app/features/ai/lib/assistant-ui-chat-hook';
import { AssistantUiChatContainer } from '@openops/components/ui';
import { t } from 'i18next';
import { ReactNode, useCallback } from 'react';
import { AssistantUiHistory } from '../../../../../../ui-components/src/components/assistant-ui/history/assistant-ui-history';

type AssistantUiChatProps = {
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  handleInject?: (codeContent: string) => void;
  onHistroyToggle?: (isOpened: boolean) => void;
};

const AssistantUiChat = ({
  onClose,
  children,
  title,
  handleInject,
}: AssistantUiChatProps) => {
  const {
    runtime,
    shouldRenderChat,
    openChatResponse,
    isLoading,
    hasMessages,
    openChat,
    chatsHistory,
    showHistory,
    setShowHistory,
  } = useAssistantChat();

  const { theme } = useTheme();

  const {
    selectedModel,
    availableModels,
    onModelSelected,
    isLoading: isModelSelectorLoading,
  } = useAiModelSelector();

  const toggleHistory = useCallback(() => {
    setShowHistory((showHistory) => !showHistory);
  }, [setShowHistory]);

  if (isLoading || !openChatResponse) {
    return (
      <div className="w-full flex h-full items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">
          {t('Loading chat...')}
        </div>
      </div>
    );
  }

  if (!shouldRenderChat) {
    return (
      <div className="w-full flex h-full items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">
          {t('Initializing chat...')}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex ">
      {showHistory && (
        <AssistantUiHistory
          onNewChat={openChat}
          newChatDisabled={!hasMessages}
          onChatSelected={openChat}
          onChatDeleted={function (chatId: string): void {
            throw new Error('Function not implemented.');
          }}
          chatItems={chatsHistory ?? []}
        />
      )}
      <AssistantUiChatContainer
        onClose={onClose}
        runtime={runtime}
        onNewChat={openChat}
        title={title}
        enableNewChat={hasMessages}
        availableModels={availableModels}
        onModelSelected={onModelSelected}
        isModelSelectorLoading={isModelSelectorLoading}
        selectedModel={selectedModel}
        theme={theme}
        handleInject={handleInject}
        onToggleHistory={toggleHistory}
      >
        {children}
      </AssistantUiChatContainer>
    </div>
  );
};

export default AssistantUiChat;
