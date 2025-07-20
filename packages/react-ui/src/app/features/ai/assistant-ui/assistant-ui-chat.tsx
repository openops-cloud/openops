import { AssistantRuntimeProvider } from '@assistant-ui/react';

import { useVercelUseChatRuntime } from '@assistant-ui/react-ai-sdk';

import {
  AI_ASSISTANT_LS_KEY,
  AI_ASSISTANT_SESSION_ID,
} from '@/app/constants/ai';
import { QueryKeys } from '@/app/constants/query-keys';
import { Message, useChat } from '@ai-sdk/react';
import { Thread, ThreadWelcomeProvider } from '@openops/components/ui';
import { OpenChatResponse } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { aiAssistantChatApi } from '../lib/ai-assistant-chat-api';
const prompts = [
  t('What is the most recent workflow?'),
  t('What is my last failed run?'),
];

const suggestions = prompts.map((prompt) => ({
  prompt,
  label: prompt,
}));

export const AssistantUiChat = () => {
  const chatId = useRef(localStorage.getItem(AI_ASSISTANT_LS_KEY));

  const { data: openChatResponse } = useQuery({
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

  const convertedMessages = useMemo(() => {
    const convertMessages = (messages: any[] | undefined): Message[] => {
      return (
        messages?.map((msg) => {
          if (typeof msg.content === 'string') {
            return {
              id: msg.id || uuidv4(),
              role: msg.role,
              content: msg.content,
            };
          }

          if (Array.isArray(msg.content)) {
            const contentString = msg.content
              .map((part: any) => {
                if (part.type === 'text' && part.text) {
                  return part.text;
                }
                return '';
              })
              .join('');

            return {
              id: msg.id || uuidv4(),
              role: msg.role,
              content: contentString,
            };
          }

          return {
            id: msg.id || uuidv4(),
            role: msg.role,
            content: msg.content || '',
          };
        }) || []
      );
    };

    return convertMessages(openChatResponse?.messages);
  }, [openChatResponse?.messages]);

  const chat = useChat({
    id: AI_ASSISTANT_SESSION_ID,
    api: '/api/v1/ai/conversation',
    maxSteps: 5,
    body: {
      chatId: openChatResponse?.chatId,
    },
    initialMessages: convertedMessages,
    experimental_prepareRequestBody: () => ({
      chatId: openChatResponse?.chatId,
      message: chat.input,
    }),

    headers: {
      Authorization: `Bearer ${authenticationSession.getToken()}`,
    },
  });
  const runtime = useVercelUseChatRuntime(chat);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadWelcomeProvider
        greeting={t('How can I help you today?')}
        suggestions={suggestions}
      >
        <div className="flex flex-col">
          <Thread />
        </div>
      </ThreadWelcomeProvider>
    </AssistantRuntimeProvider>
  );
};
