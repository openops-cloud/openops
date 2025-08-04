import { useTheme } from '@/app/common/providers/theme-provider';
import { useAiModelSelector } from '@/app/features/ai/lib/ai-model-selector-hook';
import { useAssistantChat } from '@/app/features/ai/lib/assistant-ui-chat-hook';
import { AssistantUiChatContainer } from '@openops/components/ui';
import { t } from 'i18next';
import { ReactNode } from 'react';
import { useFrontendTools } from '../lib/use-frontend-tools';

type AssistantUiChatProps = {
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  handleInject?: (codeContent: string) => void;
};

const AssistantUiChat = ({
  onClose,
  children,
  title,
  handleInject,
}: AssistantUiChatProps) => {
  const { toolComponents, isLoading: isLoadingTools } = useFrontendTools();
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

  if (isLoading || !openChatResponse || isLoadingTools) {
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
      handleInject={handleInject}
      toolComponents={toolComponents}
    >
      {children}
    </AssistantUiChatContainer>
  );
};

export default AssistantUiChat;
