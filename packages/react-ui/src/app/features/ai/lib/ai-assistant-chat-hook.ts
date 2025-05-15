import { QueryKeys } from '@/app/constants/query-keys';
import { aiAssistantChatApi } from '@/app/features/ai/lib/ai-assistant-chat-api';
import { authenticationSession } from '@/app/lib/authentication-session';
import { Message, useChat } from '@ai-sdk/react';
import { toast } from '@openops/components/ui';
import { OpenChatResponse } from '@openops/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { useCallback, useRef } from 'react';

const AI_ASSISTANT_LS_KEY = 'ai_assistant_chat_id';

export const useAiAssistantChat = () => {
  const chatId = useRef(localStorage.getItem(AI_ASSISTANT_LS_KEY));

  const { isPending: isOpenAiChatPending, data: openChatResponse } = useQuery({
    queryKey: [QueryKeys.openAiAssistantChat, chatId.current],
    queryFn: async () => {
      const conversation = await aiAssistantChatApi.open(chatId.current);
      onConversationRetrieved(conversation);
      return conversation;
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
      chatId.current = conversation.chatId;
    }
  };

  const queryClient = useQueryClient();

  const createNewChat = useCallback(async () => {
    const oldChatId = chatId.current;

    chatId.current = null;

    try {
      if (oldChatId) {
        await aiAssistantChatApi.delete(oldChatId);

        await queryClient.invalidateQueries({
          queryKey: [QueryKeys.openAiAssistantChat, oldChatId],
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
  }, [queryClient, setMessages]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    createNewChat,
    isOpenAiChatPending,
  };
};
