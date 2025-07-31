import { AI_ASSISTANT_LS_KEY } from '@/app/constants/ai';
import { QueryKeys } from '@/app/constants/query-keys';
import { aiAssistantChatApi } from '@/app/features/ai/lib/ai-assistant-chat-api';
import { getActionName, getBlockName } from '@/app/features/blocks/lib/utils';
import { authenticationSession } from '@/app/lib/authentication-session';
import { ThreadMessageLike } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';
import { toast } from '@openops/components/ui';
import { flowHelper, FlowVersion, OpenChatResponse } from '@openops/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { aiChatApi } from '../../builder/ai-chat/lib/chat-api';

const PLACEHOLDER_MESSAGE_INTEROP = 'satisfy-schema';

interface UseAssistantChatProps {
  flowVersion?: FlowVersion;
  selectedStep?: string;
}

const buildQueryKey = (
  selectedStep: string | undefined,
  flowVersionId: string | undefined,
  chatId: string | null,
  blockName: string | undefined,
) => {
  const baseKey = [
    selectedStep ? QueryKeys.openChat : QueryKeys.openAiAssistantChat,
    selectedStep ? flowVersionId : chatId,
  ];

  if (selectedStep && blockName) {
    baseKey.push(blockName);
  }

  if (selectedStep) {
    baseKey.push(selectedStep);
  }

  return baseKey;
};

export const useAssistantChat = (props?: UseAssistantChatProps) => {
  const { flowVersion, selectedStep } = props ?? {};
  const chatId = useRef(localStorage.getItem(AI_ASSISTANT_LS_KEY));
  const [shouldRenderChat, setShouldRenderChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const stepDetails =
    flowVersion && selectedStep
      ? flowHelper.getStep(flowVersion, selectedStep)
      : undefined;

  const queryKey = useMemo(
    () =>
      buildQueryKey(
        selectedStep,
        flowVersion?.flowId,
        chatId.current,
        stepDetails?.settings?.blockName,
      ),
    [selectedStep, flowVersion?.flowId, stepDetails?.settings?.blockName],
  );

  const { data: openChatResponse, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let conversation: OpenChatResponse;
      if (selectedStep && flowVersion && stepDetails) {
        conversation = await aiChatApi.open(
          flowVersion.flowId,
          getBlockName(stepDetails),
          selectedStep,
          getActionName(stepDetails),
        );
      } else {
        conversation = await aiAssistantChatApi.open(chatId.current);
      }

      onConversationRetrieved(conversation);
      return conversation;
    },
    enabled: selectedStep
      ? !!getBlockName(stepDetails) && !!getActionName(stepDetails)
      : true,
  });

  const { data: chatsHistory } = useQuery({
    queryKey: [QueryKeys.aiChatHistory],
    queryFn: aiAssistantChatApi.listChats,
    staleTime: Infinity,
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
  const runtime = useChatRuntime(runtimeConfig);

  const [hasMessages, setHasMessages] = useState(!!openChatResponse?.messages);

  const queryClient = useQueryClient();

  const openChat = useCallback(
    async (newChatId?: string) => {
      const oldChatId = chatId.current;

      chatId.current = newChatId ?? null;

      try {
        if (oldChatId) {
          runtime.thread.cancelRun();
          runtime.thread.reset();

          const invalidationKey = buildQueryKey(
            selectedStep,
            flowVersion?.flowId,
            oldChatId,
            stepDetails?.settings?.blockName,
          );

          await queryClient.invalidateQueries({
            queryKey: invalidationKey,
          });
        }
        setHasMessages(false);
      } catch (error) {
        toast({
          title: t(
            'There was an error creating the new chat, please try again',
          ),
          duration: 3000,
        });
        console.error(
          `There was an error canceling the current run and invalidating queries while creating a new chat: ${error}`,
        );
      }
    },
    [
      flowVersion?.flowId,
      queryClient,
      runtime.thread,
      selectedStep,
      stepDetails?.settings?.blockName,
    ],
  );

  useEffect(() => {
    const unsubscribe = runtime.thread.subscribe(() => {
      setHasMessages(!!runtime.thread.getState().messages?.length);
    });

    return () => unsubscribe();
  }, [runtime.thread]);

  return {
    runtime,
    shouldRenderChat,
    isLoading,
    openChatResponse,
    hasMessages,
    openChat,
    chatsHistory,
    showHistory,
    setShowHistory,
  };
};
