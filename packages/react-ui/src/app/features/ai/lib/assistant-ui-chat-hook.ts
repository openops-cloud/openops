import { QueryKeys } from '@/app/constants/query-keys';
import { aiAssistantChatApi } from '@/app/features/ai/lib/ai-assistant-chat-api';
import { getActionName, getBlockName } from '@/app/features/blocks/lib/utils';
import { authenticationSession } from '@/app/lib/authentication-session';
import { useChat } from '@ai-sdk/react';
import { useAISDKRuntime } from '@assistant-ui/react-ai-sdk';
import { toast } from '@openops/components/ui';
import { flowHelper, FlowVersion, OpenChatResponse } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { DefaultChatTransport, UIMessage } from 'ai';
import { t } from 'i18next';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { aiChatApi } from '../../builder/ai-chat/lib/chat-api';
import { aiSettingsHooks } from './ai-settings-hooks';
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

  const { hasActiveAiSettings, isLoading: isLoadingAiSettings } =
    aiSettingsHooks.useHasActiveAiSettings();

  const stepDetails =
    flowVersion && selectedStep
      ? flowHelper.getStep(flowVersion, selectedStep)
      : undefined;

  const isQueryEnabled = useMemo(() => {
    if (isLoadingAiSettings) {
      return false;
    }

    if (selectedStep) {
      return (
        !!getBlockName(stepDetails) &&
        !!getActionName(stepDetails) &&
        hasActiveAiSettings
      );
    }

    return hasActiveAiSettings;
  }, [selectedStep, stepDetails, hasActiveAiSettings, isLoadingAiSettings]);

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

      return conversation;
    },
    enabled: isQueryEnabled,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (openChatResponse?.chatId) {
      onChatIdChange(openChatResponse.chatId);
    }
  }, [onChatIdChange, openChatResponse?.chatId]);

  const additionalContext = useMemo(
    () =>
      flowVersion
        ? createAdditionalContext(flowVersion, stepDetails)
        : undefined,
    [flowVersion, stepDetails],
  );

  // workaround for https://github.com/vercel/ai/issues/7819#issuecomment-3172625487
  const bodyRef = useRef({
    chatId,
    message: PLACEHOLDER_MESSAGE_INTEROP,
    additionalContext,
  });

  const messagesRef = useRef<UIMessage[]>([]);

  useEffect(() => {
    bodyRef.current = {
      chatId,
      message: PLACEHOLDER_MESSAGE_INTEROP,
      additionalContext,
    };
  }, [chatId, additionalContext]);

  const chat = useChat({
    id: chatId ?? undefined,
    transport: new DefaultChatTransport({
      api: '/api/v1/ai/conversation',
      headers: {
        Authorization: `Bearer ${authenticationSession.getToken()}`,
      },
      body: () => ({
        ...bodyRef.current,
        messages: messagesRef.current,
      }),
    }),
    onError: (error) => {
      console.error('chat error', error);
      const errorToast = {
        title: t('AI Chat Error'),
        description: t(
          'There was an error while processing your request, please try again or open a new chat',
        ),
        variant: 'destructive' as const,
        duration: 10000,
      };
      toast(errorToast);
    },
  });

  useEffect(() => {
    messagesRef.current = chat.messages;
    console.log('chat.messages', chat.messages);
  }, [chat.messages]);

  useEffect(() => {
    if (openChatResponse?.messages && !isLoading && chatId) {
      chat.setMessages(openChatResponse.messages as UIMessage[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isLoading, openChatResponse?.messages]);

  const runtime = useAISDKRuntime(chat);

  const createNewChat = useCallback(async () => {
    const oldChatId = chatId;

    try {
      chat.stop();

      if (oldChatId) {
        if (selectedStep && flowVersion) {
          await aiChatApi.delete(oldChatId);
          chat.setMessages([]);
        } else {
          onChatIdChange(null);
        }
      }
    } catch (error) {
      toast({
        title: t('There was an error creating the new chat, please try again'),
        duration: 3000,
      });
      console.error(
        `There was an error canceling the current run and invalidating queries while creating a new chat: ${error}`,
      );
    }
  }, [chatId, chat, selectedStep, flowVersion, onChatIdChange]);

  return {
    runtime,
    isLoading,
    createNewChat,
  };
};
