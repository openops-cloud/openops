import { QueryKeys } from '@/app/constants/query-keys';
import {
  createAdditionalContext,
  StepDetails,
} from '@/app/features/ai/lib/enrich-context';
import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { authenticationSession } from '@/app/lib/authentication-session';
import {
  Message,
  useChat,
  experimental_useObject as useObject,
} from '@ai-sdk/react';
import { BlockMetadataModel } from '@openops/blocks-framework';
import { toast } from '@openops/components/ui';
import {
  ActionType,
  CODE_BLOCK_NAME,
  flowHelper,
  FlowVersion,
  TriggerType,
  unifiedCodeLLMSchema,
  UnifiedCodeLLMSchema,
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
  const isCodeBlock = getBlockName(stepDetails) === CODE_BLOCK_NAME;

  const { blockModel } = blocksHooks.useBlock({
    name: getBlockName(stepDetails) || '',
    version: stepDetails?.settings?.blockVersion,
    enabled: !!getBlockName(stepDetails) && !isCodeBlock,
  });

  useEffect(() => {
    setChatSessionKey(nanoid());
  }, [selectedStep]);

  const supportsAI =
    isCodeBlock || doesActionSupportsAI(stepDetails, blockModel);

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
        stepDetails?.id ?? '',
        getActionName(stepDetails),
      );
    },
    enabled:
      !!getBlockName(stepDetails) &&
      !!getActionName(stepDetails) &&
      supportsAI &&
      !!stepDetails?.id,
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
    stop: stopChat,
    setInput,
  } = useChat({
    id: chatSessionKey,
    api: 'api/v1/ai/conversation',
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

  const { submit: submitCodeRequest, isLoading: isCodeGenerating } = useObject({
    id: `code-${chatSessionKey}`,
    api: 'api/v1/ai/conversation/code',
    schema: unifiedCodeLLMSchema,
    headers: {
      Authorization: `Bearer ${authenticationSession.getToken()}`,
      'Content-Type': 'application/json',
    },
    onFinish: ({ object }: { object: UnifiedCodeLLMSchema | undefined }) => {
      if (object) {
        const assistantMessage: Message = {
          id: nanoid(),
          role: 'assistant',
          content: object.textAnswer,
          createdAt: new Date(),
          annotations: [object],
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    },
    onError: (error) => {
      toast({
        title: t('Code generation failed'),
        description: error.message || 'An unexpected error occurred',
        duration: 5000,
      });
      console.error(error);
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

  const handleCodeSubmit = useCallback(
    (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.();
      if (!input.trim()) return;

      const userMessage: Message = {
        id: nanoid(),
        role: 'user',
        content: input,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      const additionalContext =
        stepDetails && flowVersion.id
          ? createAdditionalContext(flowVersion, stepDetails)
          : undefined;

      submitCodeRequest({
        chatId: openChatResponse?.chatId,
        message: input,
        additionalContext,
      });

      setInput('');
    },
    [
      input,
      openChatResponse?.chatId,
      stepDetails,
      flowVersion,
      setMessages,
      submitCodeRequest,
      setInput,
    ],
  );

  const getStatus = useCallback(() => {
    if (isCodeBlock) {
      return isCodeGenerating ? 'streaming' : 'ready';
    }
    return status;
  }, [isCodeBlock, isCodeGenerating, status]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit: isCodeBlock ? handleCodeSubmit : handleSubmit,
    status: getStatus(),
    onNewChatClick,
    enableNewChat,
    isOpenAiChatPending,
    isEmpty: !messages.length,
  };
};

const getBlockName = (stepDetails: StepDetails) => {
  if (stepDetails?.settings?.blockName) {
    return stepDetails?.settings?.blockName;
  }

  return stepDetails?.type === ActionType.CODE ? CODE_BLOCK_NAME : '';
};

const getActionName = (stepDetails: StepDetails) => {
  if (stepDetails?.settings?.actionName) {
    return stepDetails?.settings?.actionName;
  }

  return stepDetails?.type === ActionType.CODE ? ActionType.CODE : '';
};

const doesActionSupportsAI = (
  stepDetails: StepDetails,
  blockModel: BlockMetadataModel | undefined,
): boolean => {
  if (!stepDetails || !blockModel) {
    return false;
  }

  const actionName = getActionName(stepDetails);
  if (!actionName) {
    return false;
  }

  let actionOrTrigger = null;
  if (stepDetails.type === ActionType.BLOCK) {
    actionOrTrigger = blockModel.actions?.[actionName];
  } else if (stepDetails.type === TriggerType.BLOCK) {
    actionOrTrigger = blockModel.triggers?.[actionName];
  }

  if (!actionOrTrigger?.props) {
    return false;
  }

  return Object.values(actionOrTrigger.props).some(
    (prop: any) => prop?.supportsAI === true,
  );
};
