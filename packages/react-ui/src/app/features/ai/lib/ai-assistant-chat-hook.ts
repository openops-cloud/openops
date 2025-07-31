import {
  AI_ASSISTANT_LS_KEY,
  AI_ASSISTANT_SESSION_ID,
} from '@/app/constants/ai';
import { QueryKeys } from '@/app/constants/query-keys';
import { aiAssistantChatApi } from '@/app/features/ai/lib/ai-assistant-chat-api';
import { authenticationSession } from '@/app/lib/authentication-session';
import { useAppStore } from '@/app/store/app-store';
import { Message, useChat } from '@ai-sdk/react';
import { toast } from '@openops/components/ui';
import { OpenChatResponse } from '@openops/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { useCallback, useEffect, useRef } from 'react';

export const useAiAssistantChat = () => {
  const chatId = useRef(localStorage.getItem(AI_ASSISTANT_LS_KEY));
  const { aiChatInput, setAiChatInput, clearAiChatInput } = useAppStore(
    (s) => ({
      aiChatInput: s.aiChatInput,
      setAiChatInput: s.setAiChatInput,
      clearAiChatInput: s.clearAiChatInput,
    }),
  );

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
    input: aiInput,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
    stop: stopChat,
  } = useChat({
    id: AI_ASSISTANT_SESSION_ID,
    api: '/api/v1/ai/conversation',
    maxSteps: 1,
    body: {
      chatId: openChatResponse?.chatId,
    },
    initialMessages: openChatResponse?.messages as Message[],
    initialInput: aiChatInput,
    experimental_prepareRequestBody: () => ({
      chatId: openChatResponse?.chatId,
      message: aiInput,
    }),

    headers: {
      Authorization: `Bearer ${authenticationSession.getToken()}`,
    },
  });

  useEffect(() => {
    if (aiInput !== aiChatInput) {
      setAiChatInput(aiInput);
    }
  }, [aiInput, aiChatInput, setAiChatInput]);

  const handleInputChangeWithStore = useCallback(
    (
      e:
        | React.ChangeEvent<HTMLTextAreaElement>
        | React.ChangeEvent<HTMLInputElement>,
    ) => {
      handleInputChange(e);
      setAiChatInput(e.target.value);
    },
    [handleInputChange, setAiChatInput],
  );

  const handleSubmitWithCleanup = useCallback(() => {
    handleSubmit();
    clearAiChatInput();
  }, [handleSubmit, clearAiChatInput]);

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
      stopChat();
      if (oldChatId) {
        await aiAssistantChatApi.delete(oldChatId);

        await queryClient.invalidateQueries({
          queryKey: [QueryKeys.openAiAssistantChat, oldChatId],
        });
        setMessages([]);
      }
      clearAiChatInput();
    } catch (error) {
      toast({
        title: t('There was an error creating the new chat, please try again'),
        duration: 3000,
      });
      console.error(
        `There was an error deleting existing chat and creating a new one: ${error}`,
      );
    }
  }, [queryClient, setMessages, stopChat, clearAiChatInput]);

  return {
    messages,
    input: aiInput,
    handleInputChange: handleInputChangeWithStore,
    handleSubmit: handleSubmitWithCleanup,
    status,
    createNewChat,
    isOpenAiChatPending,
  };
};
