import { QueryKeys } from '@/app/constants/query-keys';
import { authenticationSession } from '@/app/lib/authentication-session';
import {
  Message,
  useChat,
  experimental_useObject as useObject,
} from '@ai-sdk/react';
import { toast } from '@openops/components/ui';
import {
  Action,
  ActionType,
  CodeSchema,
  codeSchema,
  flowHelper,
  FlowVersion,
  TriggerWithOptionalId,
} from '@openops/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useState } from 'react';
import { aiChatApi } from './chat-api';

// todo move to shared && use in prompt service
const CODE_BLOCK_NAME = '@openops/code';
const CODE_ACTION_NAME = 'code';

export const useStepSettingsAiChat = (
  flowVersion: FlowVersion,
  selectedStep: string,
) => {
  const [chatSessionKey, setChatSessionKey] = useState<string>(nanoid());
  const queryClient = useQueryClient();
  const [enableNewChat, setEnableNewChat] = useState(true);

  const stepDetails = flowHelper.getStep(flowVersion, selectedStep);
  const isCodeBlock = getBlockName(stepDetails) === CODE_BLOCK_NAME;

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
    api: 'api/v1/ai/chat/code',
    schema: codeSchema,
    headers: {
      Authorization: `Bearer ${authenticationSession.getToken()}`,
      'Content-Type': 'application/json',
    },

    onFinish: ({ object }: { object: CodeSchema | undefined }) => {
      if (object) {
        const assistantMessage: Message = {
          id: nanoid(),
          role: 'assistant',
          content:
            `\`\`\`typescript\n${object.code}\n\`\`\`\n\n${object.description}` +
            '\n\n' +
            `\`\`\`json\n${object.packageJson}\n\`\`\``,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
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

      // Add user message to chat
      const userMessage: Message = {
        id: nanoid(),
        role: 'user',
        content: input,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      const additionalContext =
        stepDetails && flowVersion.id
          ? createAdditionalContext(flowVersion, selectedStep, stepDetails)
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
      selectedStep,
      setMessages,
      submitCodeRequest,
      setInput,
    ],
  );

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit: isCodeBlock ? handleCodeSubmit : handleSubmit,
    status: isCodeBlock ? (isCodeGenerating ? 'streaming' : 'ready') : status,
    onNewChatClick,
    enableNewChat,
    isOpenAiChatPending,
    isEmpty: !messages.length,
  };
};

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

const createAdditionalContext = (
  flowVersion: FlowVersion,
  selectedStep: string,
  stepData?: Action | TriggerWithOptionalId,
) => {
  const stepVariables = stepData?.settings?.input || {};
  const variables = Object.entries(stepVariables).map(([name, value]) => ({
    name,
    value: String(value || ''),
  }));

  return {
    flowId: flowVersion.flowId,
    flowVersionId: flowVersion.id,
    steps: [
      {
        id: selectedStep,
        stepName: selectedStep,
        variables: variables.length > 0 ? variables : undefined,
      },
    ],
  };
};
