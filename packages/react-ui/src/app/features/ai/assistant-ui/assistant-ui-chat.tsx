import { ThreadMessageLike } from '@assistant-ui/react';

import { useChatRuntime } from '@assistant-ui/react-ai-sdk';

import { AI_ASSISTANT_LS_KEY } from '@/app/constants/ai';
import { QueryKeys } from '@/app/constants/query-keys';
import { useAiModelSelector } from '@/app/features/ai/lib/ai-model-selector-hook';
import { authenticationSession } from '@/app/lib/authentication-session';
import { AssistantUiChatContainer, toast } from '@openops/components/ui';
import { OpenChatResponse } from '@openops/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
      api: '/api/v1/ai/conversation ',
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

  const runtime = useChatRuntime(runtimeConfig);
  const [hasMessages, setHasMessages] = useState(!!openChatResponse?.messages);

  const queryClient = useQueryClient();

  const createNewChat = useCallback(async () => {
    const oldChatId = chatId.current;

    chatId.current = null;

    try {
      if (oldChatId) {
        runtime.thread.cancelRun();
        await queryClient.invalidateQueries({
          queryKey: [QueryKeys.openAiAssistantChat, oldChatId],
        });
      }
      setHasMessages(false);
    } catch (error) {
      toast({
        title: t('There was an error creating the new chat, please try again'),
        duration: 3000,
      });
      console.error(
        `There was an error canceling the current run and invalidating queries while creating a new chat: ${error}`,
      );
    }
  }, [queryClient, runtime.thread]);

  const {
    selectedModel,
    availableModels,
    onModelSelected,
    isLoading: isModelSelectorLoading,
  } = useAiModelSelector();

  useEffect(() => {
    const unsubscribe = runtime.thread.subscribe(() => {
      setHasMessages(!!runtime.thread.getState().messages?.length);
    });

    return () => unsubscribe();
  }, [runtime.thread]);

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
    >
      {children}
    </AssistantUiChatContainer>
  );
};

export default AssistantUiChat;
