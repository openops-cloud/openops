import { QueryKeys } from '@/app/constants/query-keys';
import { aiAssistantChatApi } from '@/app/features/ai/lib/ai-assistant-chat-api';
import { getActionName, getBlockName } from '@/app/features/blocks/lib/utils';
import { authenticationSession } from '@/app/lib/authentication-session';
import { ThreadMessageLike } from '@assistant-ui/react';
import {
  useChatRuntime,
  UseChatRuntimeOptions,
} from '@assistant-ui/react-ai-sdk';
import { toast } from '@openops/components/ui';
import { flowHelper, FlowVersion, OpenChatResponse } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { aiChatApi } from '../../builder/ai-chat/lib/chat-api';
import { createAdditionalContext } from './enrich-context';

const PLACEHOLDER_MESSAGE_INTEROP = 'satisfy-schema';

interface UseAssistantChatProps {
  flowVersion?: FlowVersion;
  selectedStep?: string;
  chatId: string | null;
  onChatIdChange: (chatId: string | null) => void;
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

export const useAssistantChat = (props: UseAssistantChatProps) => {
  const { flowVersion, selectedStep, chatId, onChatIdChange } = props;
  const [shouldRenderChat, setShouldRenderChat] = useState(false);
  const [pendingConversation, setPendingConversation] =
    useState<OpenChatResponse | null>(null);

  const stepDetails =
    flowVersion && selectedStep
      ? flowHelper.getStep(flowVersion, selectedStep)
      : undefined;

  const queryKey = useMemo(
    () =>
      buildQueryKey(
        selectedStep,
        flowVersion?.flowId,
        chatId,
        stepDetails?.settings?.blockName,
      ),
    [
      selectedStep,
      flowVersion?.flowId,
      chatId,
      stepDetails?.settings?.blockName,
    ],
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
        conversation = await aiAssistantChatApi.open(chatId);
      }

      onConversationRetrieved(conversation);
      return conversation;
    },
    enabled: selectedStep
      ? !!getBlockName(stepDetails) && !!getActionName(stepDetails)
      : true,
  });

  const onConversationRetrieved = useCallback(
    (conversation: OpenChatResponse) => {
      if (conversation.chatId) {
        setPendingConversation(conversation);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isLoading && openChatResponse) {
      setShouldRenderChat(true);
    }
  }, [isLoading, openChatResponse]);

  const runtimeConfig: UseChatRuntimeOptions = useMemo(
    () => ({
      api: '/api/v1/ai/conversation',
      maxSteps: 5,
      body: {
        chatId: openChatResponse?.chatId,
        message: PLACEHOLDER_MESSAGE_INTEROP,
        additionalContext: flowVersion
          ? createAdditionalContext(flowVersion, stepDetails)
          : undefined,
      },
      headers: {
        Authorization: `Bearer ${authenticationSession.getToken()}`,
      },
    }),
    [openChatResponse?.chatId, flowVersion, stepDetails],
  );

  const runtime = useChatRuntime(runtimeConfig);

  const [hasMessages, setHasMessages] = useState(!!openChatResponse?.messages);

  useEffect(() => {
    if (pendingConversation && runtime && shouldRenderChat) {
      if (pendingConversation.chatId !== chatId) {
        onChatIdChange(pendingConversation.chatId);
      }

      if ((pendingConversation.messages?.length ?? 0) > 0) {
        runtime.thread.reset(
          (pendingConversation.messages ?? []) as ThreadMessageLike[],
        );
      } else {
        runtime.threads.switchToNewThread();
      }
      setPendingConversation(null);
    }
  }, [pendingConversation, runtime, shouldRenderChat, onChatIdChange, chatId]);

  const createNewChat = useCallback(async () => {
    const oldChatId = chatId;

    try {
      setPendingConversation(null);

      if (oldChatId) {
        onChatIdChange(null);
        runtime.thread.cancelRun();
        runtime.thread.reset();

        if (selectedStep && flowVersion) {
          await aiChatApi.delete(oldChatId);
        }
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
  }, [chatId, onChatIdChange, runtime.thread, selectedStep, flowVersion]);

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
