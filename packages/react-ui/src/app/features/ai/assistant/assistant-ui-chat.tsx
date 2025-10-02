import { useTheme } from '@/app/common/providers/theme-provider';
import { AI_ASSISTANT_SS_KEY } from '@/app/constants/ai';
import { useAiModelSelector } from '@/app/features/ai/lib/ai-model-selector-hook';
import { useAssistantChat } from '@/app/features/ai/lib/assistant-ui-chat-hook';
import { useBuilderStoreOutsideProviderWithSubscription } from '@/app/features/builder/builder-state-provider';
import { AssistantUiChatContainer } from '@openops/components/ui';
import { SourceCode } from '@openops/shared';
import { createFrontendTools } from '@openops/ui-kit';
import { t } from 'i18next';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { ChatMode } from '../lib/types';

type AssistantUiChatProps = {
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  handleInject?: (codeContent: string | SourceCode) => void;
};

const AssistantUiChat = ({
  onClose,
  children,
  title,
  handleInject,
}: AssistantUiChatProps) => {
  const toolComponents = useMemo(() => {
    return createFrontendTools();
  }, []);

  const [chatId, setChatId] = useState<string | null>(
    sessionStorage.getItem(AI_ASSISTANT_SS_KEY),
  );

  const onChatIdChange = useCallback((id: string | null) => {
    if (id) {
      sessionStorage.setItem(AI_ASSISTANT_SS_KEY, id);
    } else {
      sessionStorage.removeItem(AI_ASSISTANT_SS_KEY);
    }

    setChatId(id);
  }, []);

  const context = useBuilderStoreOutsideProviderWithSubscription((state) => ({
    flowId: state.flow.id,
    flowVersionId: state.flowVersion.id,
    runId: state.run?.id,
    selectedStep: state.selectedStep,
    showSettingsAIChat: state.midpanelState.showAiChat,
  }));

  const { runtime, isLoading, createNewChat, provider, model } =
    useAssistantChat({
      chatId,
      onChatIdChange,
      chatMode: ChatMode.Agent,
      context,
    });

  const { theme } = useTheme();

  const {
    selectedModel,
    availableModels,
    onModelSelected,
    isLoading: isModelSelectorLoading,
  } = useAiModelSelector({ chatId, provider, model });

  if (isLoading) {
    return (
      <div className="w-full flex h-full items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">
          {t('Loading chat...')}
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
