import { useTheme } from '@/app/common/providers/theme-provider';
import { AI_ASSISTANT_SS_KEY } from '@/app/constants/ai';
import { useAiModelSelector } from '@/app/features/ai/lib/ai-model-selector-hook';
import { useAssistantChat } from '@/app/features/ai/lib/assistant-ui-chat-hook';
import { useBuilderStoreOutsideProviderWithSubscription } from '@/app/features/builder/builder-state-provider';
import {
  AssistantUiChatContainer,
  AssistantUiHistory,
} from '@openops/components/ui';
import { SourceCode } from '@openops/shared';
import { createFrontendTools } from '@openops/ui-kit';
import { t } from 'i18next';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { useNetworkStatusWithWarning } from '../lib/hooks/use-network-status-with-warning';
import { ChatMode } from '../lib/types';
import { useAssistantChatHistory } from '../lib/use-ai-assistant-chat-history';

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
  const [showHistory, setShowHistory] = useState(false);

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

  const { runtime, isLoading, createNewChat, provider, model, chatStatus } =
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

  const {
    chats,
    isLoading: isHistoryLoading,
    deleteChat,
    renameChat,
    refetchChatList,
  } = useAssistantChatHistory();

  const { isShowingSlowWarning, connectionError } =
    useNetworkStatusWithWarning(chatStatus);

  const currentChatTitle = useMemo(() => {
    if (chatId) {
      const currentChat = chats.find((chat) => chat.id === chatId);
      return currentChat?.displayName || title;
    }
    return title;
  }, [chatId, chats, title]);

  const onChatSelected = useCallback(
    (id: string) => {
      onChatIdChange(id);
      setShowHistory(false);
    },
    [onChatIdChange],
  );

  const onChatDeleted = useCallback(
    async (id: string) => {
      await deleteChat(id);
      if (chatId === id) {
        onChatIdChange(null);
      }
    },
    [chatId, deleteChat, onChatIdChange],
  );

  const onChatRenamed = useCallback(
    async (id: string, newName: string) => {
      await renameChat({ chatId: id, chatName: newName });
    },
    [renameChat],
  );

  const onNewChatClick = useCallback(async () => {
    await createNewChat();
    refetchChatList();
    setShowHistory(false);
  }, [createNewChat, refetchChatList]);

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
    <div className="w-full h-full flex">
      <AssistantUiChatContainer
        onClose={onClose}
        runtime={runtime}
        onNewChat={onNewChatClick}
        title={currentChatTitle}
        defaultTitle={title}
        availableModels={availableModels}
        onModelSelected={onModelSelected}
        isModelSelectorLoading={isModelSelectorLoading}
        selectedModel={selectedModel}
        theme={theme}
        handleInject={handleInject}
        toolComponents={toolComponents}
        onHistoryOpenChange={setShowHistory}
        isHistoryOpen={showHistory}
        chatId={chatId}
        isShowingSlowWarning={isShowingSlowWarning}
        connectionError={connectionError}
      >
        {showHistory && (
          <AssistantUiHistory
            onNewChat={onNewChatClick}
            newChatDisabled={isLoading || isHistoryLoading}
            onChatSelected={onChatSelected}
            onChatDeleted={onChatDeleted}
            onChatRenamed={onChatRenamed}
            chatItems={chats}
            selectedItemId={chatId ?? undefined}
          />
        )}
        {children}
      </AssistantUiChatContainer>
    </div>
  );
};

export default AssistantUiChat;
