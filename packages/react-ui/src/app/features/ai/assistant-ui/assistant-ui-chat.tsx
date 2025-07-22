import { ThreadMessageLike } from '@assistant-ui/react';

import { useChatRuntime } from '@assistant-ui/react-ai-sdk';

import { AI_ASSISTANT_LS_KEY } from '@/app/constants/ai';
import { QueryKeys } from '@/app/constants/query-keys';
import { useAiModelSelector } from '@/app/features/ai/lib/ai-model-selector-hook';
import { authenticationSession } from '@/app/lib/authentication-session';
import { AssistantUiChatContainer } from '@openops/components/ui';
import { OpenChatResponse } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { aiAssistantChatApi } from '../lib/ai-assistant-chat-api';

const PLACEHOLDER_MESSAGE_INTEROP = 'satisfy-schema';

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
  const chatId = useRef(localStorage.getItem(AI_ASSISTANT_LS_KEY));
  const [shouldRenderChat, setShouldRenderChat] = useState(false);

  const { data: openChatResponse, isLoading } = useQuery({
    queryKey: [QueryKeys.openAiAssistantChat, chatId.current],
    queryFn: async () => {
      const conversation = await aiAssistantChatApi.open(chatId.current);
      onConversationRetrieved(conversation);
      return conversation;
    },
  });

  const onConversationRetrieved = (conversation: OpenChatResponse) => {
    if (conversation.chatId) {
      localStorage.setItem(AI_ASSISTANT_LS_KEY, conversation.chatId);
      chatId.current = conversation.chatId;
    }
  };

  useEffect(() => {
    if (!isLoading && openChatResponse) {
      setShouldRenderChat(true);
    }
  }, [isLoading, openChatResponse]);

  const runtimeConfig = useMemo(
    () => ({
      api: '/api/v1/ai/conversation',
      maxSteps: 5,
      body: {
        chatId: openChatResponse?.chatId,
        message: PLACEHOLDER_MESSAGE_INTEROP,
      },
      initialMessages: openChatResponse?.messages as ThreadMessageLike[],
      headers: {
        Authorization: `Bearer ${authenticationSession.getToken()}`,
      },
    }),
    [openChatResponse?.chatId, openChatResponse?.messages],
  );

  const {
    selectedModel,
    availableModels,
    onModelSelected,
    isLoading: isModelSelectorLoading,
  } = useAiModelSelector();

  const runtime = useChatRuntime(runtimeConfig);

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
      onNewChat={() => {}}
      title={title}
      enableNewChat={true}
      availableModels={availableModels}
      onModelSelected={onModelSelected}
      isModelSelectorLoading={isModelSelectorLoading}
      selectedModel={selectedModel}
    >
      {children}
    </AssistantUiChatContainer>
  );
};

export default AssistantUiChat;
