import { QueryKeys } from '@/app/constants/query-keys';
import { authenticationSession } from '@/app/lib/authentication-session';
import { Message, useChat } from '@ai-sdk/react';
import { toast } from '@openops/components/ui';
import { flowHelper, FlowVersion } from '@openops/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useState } from 'react';
import { aiChatApi } from './chat-api';

export const useStepSettingsAiChat = (
  flowVersion: FlowVersion,
  selectedStep: string,
) => {
  const [chatSessionKey, setChatSessionKey] = useState<string>(nanoid());
  const queryClient = useQueryClient();
  const [enableNewChat, setEnableNewChat] = useState(true);

  const stepDetails = flowHelper.getStep(flowVersion, selectedStep);

  useEffect(() => {
    setChatSessionKey(nanoid());
  }, [selectedStep]);

  const { isPending: isOpenAiChatPending, data: openChatResponse } = useQuery({
    queryKey: [
      QueryKeys.openChat,
      flowVersion.flowId,
      stepDetails?.settings?.blockName,
      selectedStep,
    ],
    queryFn: async () => {
      if (!stepDetails || !selectedStep) {
        return;
      }
      return aiChatApi.open(
        flowVersion.flowId,
        stepDetails?.settings?.blockName,
        selectedStep,
        stepDetails.settings.actionName,
      );
    },
    enabled: Boolean(
      stepDetails?.settings.blockName &&
        stepDetails?.settings.actionName &&
        selectedStep,
    ),
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
  } = useChat({
    id: chatSessionKey,
    api: 'api/v1/ai/chat/conversation',
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

  const onNewChatClick = useCallback(async () => {
    const chatId = openChatResponse?.chatId;
    if (!selectedStep || !chatId) {
      return;
    }

    setEnableNewChat(false);

    try {
      await aiChatApi.delete(chatId);

      const stepDetails = flowHelper.getStep(flowVersion, selectedStep);
      const blockName = stepDetails?.settings?.blockName;

      await queryClient.invalidateQueries({
        queryKey: [
          QueryKeys.openChat,
          flowVersion.flowId,
          blockName,
          selectedStep,
        ],
      });
      setMessages([]);
    } catch (error) {
      toast({
        title: t('There was an error creating the new chat, please try again'),
        duration: 3000,
      });
      console.error(
        `There was an error deleting existing chat and creating a new one: ${error}`,
      );
    } finally {
      setEnableNewChat(true);
    }
  }, [
    flowVersion,
    openChatResponse?.chatId,
    queryClient,
    selectedStep,
    setMessages,
  ]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    onNewChatClick,
    enableNewChat,
    isOpenAiChatPending,
    isEmpty: !messages.length,
  };
};
