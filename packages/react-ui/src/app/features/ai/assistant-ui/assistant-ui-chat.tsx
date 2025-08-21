import { useTheme } from '@/app/common/providers/theme-provider';
import { AI_ASSISTANT_LS_KEY } from '@/app/constants/ai';
import { useAiModelSelector } from '@/app/features/ai/lib/ai-model-selector-hook';
import { useAssistantChat } from '@/app/features/ai/lib/assistant-ui-chat-hook';
import { useSafeBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { AssistantUiChatContainer } from '@openops/components/ui';
import { SourceCode } from '@openops/shared';
import { createFrontendTools } from '@openops/ui-kit';
import { t } from 'i18next';
import { ReactNode, useCallback, useMemo, useState } from 'react';

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

  const builderContext = useSafeBuilderStateContext((state) => ({
    flowVersion: state.flowVersion,
    selectedStep: state.selectedStep,
    run: state.run,
  }));

  const [chatId, setChatId] = useState<string | null>(
    localStorage.getItem(AI_ASSISTANT_LS_KEY),
  );

  const onChatIdChange = useCallback((id: string | null) => {
    if (id) {
      localStorage.setItem(AI_ASSISTANT_LS_KEY, id);
    } else {
      localStorage.removeItem(AI_ASSISTANT_LS_KEY);
    }

    setChatId(id);
  }, []);

  const { runtime, isLoading, createNewChat } = useAssistantChat({
    chatId,
    onChatIdChange,
    flowVersion: builderContext?.flowVersion,
    selectedStep: builderContext?.selectedStep || undefined,
    runId: builderContext?.run?.id || undefined,
  });

  const { theme } = useTheme();

  const {
    selectedModel,
    availableModels,
    onModelSelected,
    isLoading: isModelSelectorLoading,
  } = useAiModelSelector();

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
