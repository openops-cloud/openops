'use client';

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
import { AWSGetCostAndUsageToolUI } from './tools/aws-tool';
import { GETv1FlowsToolUI } from './tools/get-v1flows-tool';
const AI_ASSISTANT_LS_KEY = 'ai_assistant_chat_id';

/**
 * Merges tool result messages into their corresponding assistant tool-call parts.
 *
 * The AI SDK and assistant-ui expect tool results to be attached as a 'result' property
 * on the relevant 'tool-call' part within the assistant message, not as separate 'tool' messages.
 * This function finds each 'tool' message, locates the matching 'tool-call' part by toolCallId,
 * and assigns only the actual result payload (not the whole toolResult object) to the 'result' property.
 *
 * @param {any[]} messages - The array of chat messages (user, assistant, tool, etc.)
 * @returns {any[]} The array of messages with tool results merged into assistant messages.
 */
function mergeToolResults(messages: any[]) {
  const merged: any[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      // Find the previous assistant message with matching toolCallId
      const toolResult = msg.content[0];
      const toolCallId = toolResult.toolCallId;
      for (let j = merged.length - 1; j >= 0; j--) {
        const prev = merged[j];
        if (prev.role === 'assistant' && Array.isArray(prev.content)) {
          const toolCallPart = prev.content.find(
            (part: any) =>
              part.type === 'tool-call' && part.toolCallId === toolCallId,
          );
          if (toolCallPart) {
            // Only assign the actual result payload, not the whole toolResult object.
            // This is required because the AI SDK and assistant-ui expect the 'result' property
            // on a 'tool-call' part to be the tool's output, not a nested object with type/toolCallId/etc.
            toolCallPart.result = toolResult.result;
            break;
          }
        }
      }
      // Do not add the tool message itself
    } else {
      merged.push(msg);
    }
  }
  return merged;
}

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

  const initialMessages: ThreadMessageLike[] = mergeToolResults(
    openChatResponse?.messages ?? [],
  ) as ThreadMessageLike[];

  const runtime = useChatRuntime({
    api: '/api/v1/ai/conversation',
    headers: {
      Authorization: `Bearer ${authenticationSession.getToken()}`,
    },
    body: {
      chatId: openChatResponse?.chatId,
    },
    initialMessages,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex flex-col">
        <Thread />
        <AWSGetCostAndUsageToolUI />
        <GETv1FlowsToolUI />
      </div>
    </AssistantRuntimeProvider>
  );
};
