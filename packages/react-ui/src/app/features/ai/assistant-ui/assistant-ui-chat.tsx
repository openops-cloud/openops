import {
  AssistantRuntimeProvider,
  ThreadMessageLike,
} from '@assistant-ui/react';

import { useChatRuntime } from '@assistant-ui/react-ai-sdk';

import { AI_ASSISTANT_LS_KEY } from '@/app/constants/ai';
import { QueryKeys } from '@/app/constants/query-keys';
import { authenticationSession } from '@/app/lib/authentication-session';
import { Thread, ThreadWelcomeProvider } from '@openops/components/ui';
import { OpenChatResponse } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { aiAssistantChatApi } from '../lib/ai-assistant-chat-api';
import { mergeToolResults } from '../lib/assistant-ui-utils';

const PLACEHOLDER_MESSAGE_INTEROP = 'satisfy-schema';

const AssistantUiChat = () => {
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

  const initialMessages: ThreadMessageLike[] = useMemo(() => {
    if (isLoading || !openChatResponse?.messages) {
      return [];
    }
    return mergeToolResults(openChatResponse.messages);
  }, [isLoading, openChatResponse?.messages]);

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
      initialMessages,
      headers: {
        Authorization: `Bearer ${authenticationSession.getToken()}`,
      },
    }),
    [openChatResponse?.chatId, initialMessages],
  );

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
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadWelcomeProvider greeting={t('How can I help you today?')}>
        <div className="flex flex-col">
          <Thread />
        </div>
      </ThreadWelcomeProvider>
    </AssistantRuntimeProvider>
  );
};

export default AssistantUiChat;
