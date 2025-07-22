import { AI_ASSISTANT_LS_KEY, ASSISTANT_UI_CHAT_ID } from '@/app/constants/ai';
import { QueryKeys } from '@/app/constants/query-keys';
import { authenticationSession } from '@/app/lib/authentication-session';
import { Message, useChat } from '@ai-sdk/react';
import { AssistantUiChatContainer } from '@openops/components/ui';
import { OpenChatResponse } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { ReactNode, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { aiAssistantChatApi } from '../lib/ai-assistant-chat-api';

import { useVercelUseChatRuntime } from '@assistant-ui/react-ai-sdk';
import { ServerMessage } from '../lib/types';

interface TextContentPart {
  type: 'text';
  text: string;
}

type ContentPart = TextContentPart;

interface ExtendedServerMessage extends ServerMessage {
  id?: string;
}

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
    const createMessage = (msg: ExtendedServerMessage): Message => ({
      id: msg.id || uuidv4(),
      role: msg.role as Message['role'],
      content: typeof msg.content === 'string' ? msg.content : '',
    });

    const extractTextFromContent = (content: ContentPart[]): string => {
      return content
        .map((part: ContentPart) => {
          if (part.type === 'text' && part.text) {
            return part.text;
          }
          return '';
        })
        .join('');
    };

    const convertMessage = (msg: ExtendedServerMessage): Message => {
      if (typeof msg.content === 'string') {
        return createMessage(msg);
      }

      if (Array.isArray(msg.content)) {
        const contentString = extractTextFromContent(msg.content);
        return {
          id: msg.id || uuidv4(),
          role: msg.role as Message['role'],
          content: contentString,
        };
      }

      return createMessage(msg);
    };

    const convertMessages = (
      messages: ExtendedServerMessage[] | undefined,
    ): Message[] => {
      return messages?.map(convertMessage) || [];
    };

    return convertMessages(
      openChatResponse?.messages as ExtendedServerMessage[],
    );
  }, [openChatResponse?.messages]);

  const chat = useChat({
    id: ASSISTANT_UI_CHAT_ID,
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
    <AssistantUiChatContainer
      onClose={onClose}
      runtime={runtime}
      onNewChat={() => {}}
      title={title}
      enableNewChat={true}
    >
      {children}
    </AssistantUiChatContainer>
  );
};

export default AssistantUiChat;
