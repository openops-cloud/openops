'use client';

// import { AppSidebar } from '@/ui/app-sidebar';
import { authenticationSession } from '@/app/lib/authentication-session';
import {
  AssistantRuntimeProvider,
  ThreadMessageLike,
} from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';

import { QueryKeys } from '@/app/constants/query-keys';
import { OpenChatResponse } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { Thread } from './assistant-ui/thread';
import { aiAssistantChatApi } from './lib/ai-assistant-chat-api';
const AI_ASSISTANT_LS_KEY = 'ai_assistant_chat_id';

export const AssistantV2 = () => {
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

  const runtime = useChatRuntime({
    api: '/api/v1/ai/conversation',
    headers: {
      Authorization: `Bearer ${authenticationSession.getToken()}`,
    },
    body: {
      chatId: openChatResponse?.chatId,
    },
    initialMessages: openChatResponse?.messages as ThreadMessageLike[],
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* <SidebarProvider>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </header>
          <Thread />
        </SidebarInset>
      </SidebarProvider> */}

      <div className="flex flex-col">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};
