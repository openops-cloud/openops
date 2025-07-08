import { QueryKeys } from '@/app/constants/query-keys';
import { authenticationSession } from '@/app/lib/authentication-session';
import { Message, useChat } from '@ai-sdk/react';
import { toast } from '@openops/components/ui';
import {
  Action,
  ActionType,
  flowHelper,
  FlowVersion,
  TriggerWithOptionalId,
} from '@openops/shared';
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
        getBlockName(stepDetails),
        selectedStep,
        getActionName(stepDetails),
      );
    },
    enabled: !!getBlockName(stepDetails) && !!getActionName(stepDetails),
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
    stop: stopChat,
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
      stopChat();
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
    stopChat,
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

const CODE_BLOCK_NAME = '@openops/code';
const CODE_ACTION_NAME = 'code';

const getBlockName = (
  stepDetails: Action | TriggerWithOptionalId | undefined,
) => {
  if (stepDetails?.settings?.blockName) {
    return stepDetails?.settings?.blockName;
  }

  return stepDetails?.type === ActionType.CODE ? CODE_BLOCK_NAME : '';
};

const getActionName = (
  stepDetails: Action | TriggerWithOptionalId | undefined,
) => {
  if (stepDetails?.settings?.actionName) {
    return stepDetails?.settings?.actionName;
  }

  return stepDetails?.type === ActionType.CODE ? CODE_ACTION_NAME : '';
};
