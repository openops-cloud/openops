import { QueryKeys } from '@/app/constants/query-keys';
import { aiAssistantChatApi } from '@/app/features/ai/lib/ai-assistant-chat-api';
import { authenticationSession } from '@/app/lib/authentication-session';
import { Message, useChat } from '@ai-sdk/react';
import { toast } from '@openops/components/ui';
import { OpenChatResponse } from '@openops/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { useCallback, useMemo, useState } from 'react';
import { MessageType } from './types';

const AI_ASSISTANT_LS_KEY = 'ai_assistant_chat_id';

export const useAiAssistantChat = () => {
  const [chatId, setChatId] = useState<string | null>(
    localStorage.getItem(AI_ASSISTANT_LS_KEY),
  );

  const { isPending: isOpenAiChatPending, data: openChatResponse } = useQuery({
    queryKey: [QueryKeys.openAiAssistantChat],
    queryFn: async () => {
      return await aiAssistantChatApi.open(chatId);
    },
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
  } = useChat({
    api: '/api/v1/ai/conversation',
    maxSteps: 5,
    body: {
      chatId: openChatResponse?.chatId,
    },
    initialMessages: openChatResponse?.messages as Message[],
    experimental_prepareRequestBody: () => ({
      chatId: openChatResponse?.chatId,
      message: input,
    }),

    headers: {
      Authorization: `Bearer ${authenticationSession.getToken()}`,
    },
  });

  const onConversationRetrieved = (conversation: OpenChatResponse) => {
    if (conversation.chatId) {
      localStorage.setItem(AI_ASSISTANT_LS_KEY, conversation.chatId);
    }
    setChatId(conversation?.chatId ?? null);
  };

  const messagesToDisplay: MessageType[] = useMemo(() => {
    return messages.length > 0 ? messages : openChatResponse?.messages ?? [];
  }, [messages, openChatResponse?.messages]);

  const queryClient = useQueryClient();

  const createNewChat = useCallback(async () => {
    const chatId = openChatResponse?.chatId;

    setChatId(null);

    try {
      if (chatId) {
        await aiAssistantChatApi.delete(chatId);

        await queryClient.invalidateQueries({
          queryKey: [QueryKeys.openAiAssistantChat],
        });
        setMessages([]);
      }
    } catch (error) {
      toast({
        title: t('There was an error creating the new chat, please try again'),
        duration: 3000,
      });
      console.error(
        `There was an error deleting existing chat and creating a new one: ${error}`,
      );
    }
  }, [openChatResponse?.chatId, queryClient, setMessages]);

  return {
    messages: messagesToDisplay,
    input,
    handleInputChange,
    handleSubmit,
    status,
    chatId,
    createNewChat,
    onConversationRetrieved,
    isOpenAiChatPending,
  };
};
