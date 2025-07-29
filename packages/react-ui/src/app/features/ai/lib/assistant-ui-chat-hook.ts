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

export const useAssistantChat = (props?: UseAssistantChatProps) => {
  const { flowVersion, selectedStep } = props ?? {};
  const chatId = useRef(localStorage.getItem(AI_ASSISTANT_LS_KEY));
  const [shouldRenderChat, setShouldRenderChat] = useState(false);

  const stepDetails =
    flowVersion && selectedStep
      ? flowHelper.getStep(flowVersion, selectedStep)
      : undefined;

  const queryKey = useMemo(() => {
    const baseKey = [
      selectedStep ? QueryKeys.openChat : QueryKeys.openAiAssistantChat,
      selectedStep ? flowVersion?.flowId : chatId.current,
    ];

    if (selectedStep && stepDetails?.settings?.blockName) {
      baseKey.push(stepDetails.settings.blockName);
    }

    if (selectedStep) {
      baseKey.push(selectedStep);
    }

    return baseKey;
  }, [selectedStep, flowVersion?.flowId, stepDetails?.settings?.blockName]);

  const { data: openChatResponse, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (selectedStep && flowVersion && stepDetails) {
        return aiChatApi.open(
          flowVersion.flowId,
          getBlockName(stepDetails),
          selectedStep,
          getActionName(stepDetails),
        );
      }

      const conversation = await aiAssistantChatApi.open(chatId.current);
      onConversationRetrieved(conversation);
      return conversation;
    },
    enabled: selectedStep
      ? !!getBlockName(stepDetails) && !!getActionName(stepDetails)
      : true,
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
    createNewChat,
  };
};
