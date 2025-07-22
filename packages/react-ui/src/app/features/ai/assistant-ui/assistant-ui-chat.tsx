import { AssistantRuntimeProvider } from '@assistant-ui/react';

import { useVercelUseChatRuntime } from '@assistant-ui/react-ai-sdk';

import { useTheme } from '@/app/common/providers/theme-provider';
import { AI_ASSISTANT_LS_KEY, ASSISTANT_UI_CHAT_ID } from '@/app/constants/ai';
import { QueryKeys } from '@/app/constants/query-keys';
import { authenticationSession } from '@/app/lib/authentication-session';
import {
  Message,
  useChat,
  experimental_useObject as useObject,
} from '@ai-sdk/react';
import {
  ChatStatus,
  Thread,
  ThreadWelcomeProvider,
  toast,
} from '@openops/components/ui';
import {
  Action,
  ActionType,
  ChatFlowContext,
  CODE_BLOCK_NAME,
  flowHelper,
  FlowVersion,
  OpenChatResponse,
  TriggerWithOptionalId,
  unifiedCodeLLMSchema,
  UnifiedCodeLLMSchema,
} from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { nanoid } from 'nanoid';
import { useCallback, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { aiChatApi } from '../../builder/ai-chat/lib/chat-api';
import { aiAssistantChatApi } from '../lib/ai-assistant-chat-api';
import { ServerMessage } from '../lib/types';

interface TextContentPart {
  type: 'text';
  text: string;
}

type ContentPart = TextContentPart;

interface ExtendedServerMessage extends ServerMessage {
  id?: string;
}

type StepDetails = Action | TriggerWithOptionalId | undefined;

interface UseAssistantChatProps {
  flowVersion?: FlowVersion;
  selectedStep?: string;
}

export const useAssistantChat = (props?: UseAssistantChatProps) => {
  const { flowVersion, selectedStep } = props || {};
  const chatId = useRef(localStorage.getItem(AI_ASSISTANT_LS_KEY));
  const [chatSessionKey] = useState<string>(nanoid());

  const stepDetails =
    flowVersion && selectedStep
      ? flowHelper.getStep(flowVersion, selectedStep)
      : undefined;
  const isCodeBlock = getBlockName(stepDetails) === CODE_BLOCK_NAME;

  const { data: openChatResponse } = useQuery({
    queryKey: [
      selectedStep ? QueryKeys.openChat : QueryKeys.openAiAssistantChat,
      selectedStep ? flowVersion?.flowId : chatId.current,
      selectedStep ? stepDetails?.settings?.blockName : undefined,
      selectedStep ? selectedStep : undefined,
    ],
    queryFn: async () => {
      // When we have a selected step, use the step-specific chat API
      if (selectedStep && flowVersion && stepDetails) {
        return aiChatApi.open(
          flowVersion.flowId,
          getBlockName(stepDetails),
          selectedStep,
          getActionName(stepDetails),
        );
      }

      // Otherwise use the general assistant chat API
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

  const convertedMessages = useMemo(() => {
    const createMessage = (msg: ExtendedServerMessage): Message => {
      const content = typeof msg.content === 'string' ? msg.content : '';

      return {
        id: msg.id || uuidv4(),
        role: msg.role as Message['role'],
        content,
      };
    };

    const extractTextFromContent = (content: ContentPart[]): string => {
      return content
        .map((part: ContentPart) => {
          if (part.type === 'text' && part.text) {
            return part.text;
          }
          return '';
        })
        .join('');
    };

    const convertMessage = (msg: ExtendedServerMessage): Message => {
      if (typeof msg.content === 'string') {
        return createMessage(msg);
      }

      if (Array.isArray(msg.content)) {
        const contentString = extractTextFromContent(msg.content);
        return {
          id: msg.id || uuidv4(),
          role: msg.role as Message['role'],
          content: contentString,
        };
      }

      return createMessage(msg);
    };

    const convertMessages = (
      messages: ExtendedServerMessage[] | undefined,
    ): Message[] => {
      return messages?.map(convertMessage) || [];
    };

    return convertMessages(
      openChatResponse?.messages as ExtendedServerMessage[],
    );
  }, [openChatResponse?.messages]);

  const chat = useChat({
    id: ASSISTANT_UI_CHAT_ID,
    api: '/api/v1/ai/conversation',
    maxSteps: 5,
    body: {
      chatId: openChatResponse?.chatId,
    },
    initialMessages: convertedMessages,
    experimental_prepareRequestBody: () => ({
      chatId: openChatResponse?.chatId,
      message: chat.input,
    }),

    headers: {
      Authorization: `Bearer ${authenticationSession.getToken()}`,
    },
  });

  const { submit: submitCodeRequest, isLoading: isCodeGenerating } = useObject({
    id: `code-${chatSessionKey}`,
    api: '/api/v1/ai/conversation/code',
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
          content: JSON.stringify(object),
          createdAt: new Date(),
        };

        chat.setMessages((prev) => [...prev, assistantMessage]);
      }
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: t('Code generation failed'),
        description: error.message || 'An unexpected error occurred',
        duration: 5000,
      });
    },
  });

  const handleCodeSubmit = useCallback(
    (message: string) => {
      if (!message.trim()) return;

      const userMessage: Message = {
        id: nanoid(),
        role: 'user',
        content: message,
        createdAt: new Date(),
      };

      chat.setMessages((prev) => [...prev, userMessage]);

      const additionalContext =
        stepDetails && flowVersion?.id
          ? createAdditionalContext(flowVersion, stepDetails)
          : undefined;

      submitCodeRequest({
        chatId: openChatResponse?.chatId,
        message: message,
        additionalContext,
      });

      chat.setInput('');
    },
    [
      chat,
      openChatResponse?.chatId,
      stepDetails,
      flowVersion,
      submitCodeRequest,
    ],
  );

  // Store the original append function
  const originalAppend = chat.append;

  // Create a custom append function that routes based on code block detection
  const customAppend = useCallback(
    async (
      message:
        | Message
        | { content: string; role: 'user' | 'assistant' | 'system' | 'data' },
    ) => {
      if (isCodeBlock && message.role === 'user') {
        // For code blocks, use our custom handler
        handleCodeSubmit(message.content);
        return Promise.resolve(null);
      }
      // For regular chat, use the original append
      return originalAppend(message);
    },
    [isCodeBlock, handleCodeSubmit, originalAppend],
  );

  // Create a modified chat object with our custom append
  const chatWithCustomAppend = useMemo(
    () => ({
      ...chat,
      append: customAppend,
    }),
    [chat, customAppend],
  );

  const runtime = useVercelUseChatRuntime(chatWithCustomAppend);

  const chatStatus = useMemo((): ChatStatus | undefined => {
    if (isCodeBlock) {
      return isCodeGenerating ? ChatStatus.STREAMING : ChatStatus.READY;
    }

    switch (chat.status) {
      case 'streaming':
        return ChatStatus.STREAMING;
      case 'submitted':
        return ChatStatus.SUBMITTED;
      case 'ready':
        return ChatStatus.READY;
      case 'error':
        return ChatStatus.ERROR;
      default:
        return undefined;
    }
  }, [isCodeBlock, isCodeGenerating, chat.status]);

  const createNewChat = useCallback(() => {
    if (selectedStep && flowVersion) {
      // For step-specific chats, we don't need to clear localStorage
      // Just clear the messages
      chat.setMessages([]);
    } else {
      // For general assistant chat, clear localStorage
      localStorage.removeItem(AI_ASSISTANT_LS_KEY);
      chatId.current = null;
      chat.setMessages([]);
    }
  }, [selectedStep, flowVersion, chat]);

  return {
    runtime,
    messages: chat.messages,
    input: chat.input,
    handleInputChange: chat.handleInputChange,
    handleSubmit: chat.handleSubmit,
    status: chatStatus,
    createNewChat,
  };
};

// Helper functions
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

const createAdditionalContext = (
  flowVersion: FlowVersion,
  stepData?: StepDetails,
): ChatFlowContext => {
  const stepVariables = stepData?.settings?.input || {};
  const variables = Object.entries(stepVariables).map(([name, value]) => ({
    name,
    value: String(value || ''),
  }));

  return {
    flowId: flowVersion.flowId,
    flowVersionId: flowVersion.id,
    currentStepId: stepData?.id ?? '',
    steps: [
      {
        id: stepData?.id ?? '',
        stepName: stepData?.name ?? '',
        variables: variables.length > 0 ? variables : undefined,
      },
    ],
  };
};

const AssistantUiChat = () => {
  const { runtime } = useAssistantChat();
  const { theme } = useTheme();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadWelcomeProvider greeting={t('How can I help you today?')}>
        <Thread theme={theme} />
      </ThreadWelcomeProvider>
    </AssistantRuntimeProvider>
  );
};

export default AssistantUiChat;
