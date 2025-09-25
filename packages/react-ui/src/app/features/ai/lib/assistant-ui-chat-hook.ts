import { aiAssistantChatApi } from '@/app/features/ai/lib/ai-assistant-chat-api';
import { getActionName, getBlockName } from '@/app/features/blocks/lib/utils';
import { authenticationSession } from '@/app/lib/authentication-session';
import { useChat } from '@ai-sdk/react';
import { AssistantRuntime } from '@assistant-ui/react';
import { useAISDKRuntime } from '@assistant-ui/react-ai-sdk';
import { toast } from '@openops/components/ui';
import { flowHelper } from '@openops/shared';
import { getFrontendToolDefinitions } from '@openops/ui-kit';
import { useQuery } from '@tanstack/react-query';
import { DefaultChatTransport, ToolSet, UIMessage } from 'ai';
import { t } from 'i18next';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { aiChatApi } from '../../builder/ai-chat/lib/chat-api';
import {
  getBuilderStore,
  useBuilderStoreOutsideProviderWithSubscription,
} from '../../builder/builder-state-provider';
import { aiSettingsHooks } from './ai-settings-hooks';
import { buildQueryKey } from './chat-utils';
import { createAdditionalContext } from './enrich-context';
import { ChatMode } from './types';

const PLACEHOLDER_MESSAGE_INTEROP = 'satisfy-schema';

interface UseAssistantChatProps {
  chatId: string | null;
  onChatIdChange: (chatId: string | null) => void;
  chatMode: ChatMode;
}

export const useAssistantChat = ({
  chatId,
  onChatIdChange,
  chatMode,
}: UseAssistantChatProps) => {
  const runtimeRef = useRef<AssistantRuntime | null>(null);
  const frontendTools = useMemo(
    () => getFrontendToolDefinitions() as ToolSet,
    [],
  );

  const { flowId, flowVersionId, runId, selectedStep, showSettingsAIChat } =
    useBuilderStoreOutsideProviderWithSubscription((state) => ({
      flowId: state.flow?.id,
      flowVersionId: state.flowVersion?.id,
      runId: state.run?.id,
      selectedStep: state.selectedStep,
      showSettingsAIChat: state?.midpanelState?.showAiChat ?? false,
    })) ?? {};

  const getBuilderState = useCallback(() => {
    const context = getBuilderStore();
    const state = context?.getState();

    if (!state) return null;

    return {
      flowVersion: state.flowVersion,
      selectedStep: state.selectedStep,
      run: state.run,
    };
  }, []);

  const { hasActiveAiSettings, isLoading: isLoadingAiSettings } =
    aiSettingsHooks.useHasActiveAiSettings();

  const stepDetails = useMemo(() => {
    const context = getBuilderState();
    return context?.flowVersion && context.selectedStep
      ? flowHelper.getStep(context.flowVersion, context.selectedStep)
      : undefined;
  }, [getBuilderState, selectedStep, getBuilderState()?.flowVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const isQueryEnabled = useMemo(() => {
    if (isLoadingAiSettings) {
      return false;
    }

    if (chatMode === ChatMode.Agent) {
      return hasActiveAiSettings;
    }

    if (
      selectedStep &&
      flowVersionId &&
      stepDetails &&
      showSettingsAIChat &&
      chatMode === ChatMode.StepSettings
    ) {
      return (
        !!getBlockName(stepDetails) &&
        !!getActionName(stepDetails) &&
        hasActiveAiSettings
      );
    }

    return false;
  }, [
    hasActiveAiSettings,
    isLoadingAiSettings,
    selectedStep,
    flowVersionId,
    stepDetails,
    chatMode,
    showSettingsAIChat,
    getBuilderState()?.flowVersion, // eslint-disable-line react-hooks/exhaustive-deps
  ]);

  const queryKey = useMemo(() => {
    return buildQueryKey(
      selectedStep ?? undefined,
      flowVersionId,
      chatId,
      stepDetails?.settings?.blockName,
      chatMode,
    );
  }, [
    selectedStep,
    flowVersionId,
    chatId,
    stepDetails?.settings?.blockName,
    chatMode,
    getBuilderState()?.flowVersion, // eslint-disable-line react-hooks/exhaustive-deps
  ]);

  const { data: openChatResponse, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const context = getBuilderState();

      if (chatMode === ChatMode.StepSettings) {
        if (
          context?.selectedStep &&
          context?.flowVersion &&
          stepDetails &&
          flowId
        ) {
          return await aiChatApi.open(
            flowId,
            getBlockName(stepDetails),
            context.selectedStep,
            getActionName(stepDetails),
          );
        }
      } else if (chatMode === ChatMode.Agent) {
        return await aiAssistantChatApi.open(chatId);
      }

      return null;
    },
    enabled: isQueryEnabled,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (openChatResponse?.chatId) {
      onChatIdChange(openChatResponse.chatId);
    }
  }, [onChatIdChange, openChatResponse?.chatId]);

  const additionalContext = useMemo(() => {
    const context = getBuilderState();
    return context?.flowVersion
      ? createAdditionalContext(
          context.flowVersion,
          stepDetails,
          context.run?.id,
        )
      : undefined;
  }, [flowVersionId, stepDetails, runId, getBuilderState]); // eslint-disable-line react-hooks/exhaustive-deps

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
        tools: runtimeRef.current?.thread?.getModelContext()?.tools ?? {},
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
    // https://github.com/assistant-ui/assistant-ui/issues/2327
    // handle frontend tool calls manually until this is fixed
    onToolCall: async ({ toolCall }: { toolCall: any }) => {
      if (toolCall.toolName?.startsWith('ui-')) {
        try {
          const tool =
            frontendTools[toolCall.toolName as keyof typeof frontendTools];

          if (tool && tool.execute) {
            const result = await tool.execute(
              toolCall.input || toolCall.args,
              {} as any,
            );
            chat.addToolResult({
              tool: toolCall.toolName,
              toolCallId: toolCall.toolCallId,
              output: result,
            });
          }
        } catch (error) {
          console.error('Error executing frontend tool:', error);
        }
      }
    },
    // send message automatically when there's a frontend tool call
    sendAutomaticallyWhen: ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      const lastMessagePart =
        lastMessage?.parts?.[lastMessage.parts.length - 1];
      return (
        lastMessagePart?.type?.includes('tool-ui') &&
        'output' in lastMessagePart &&
        !!lastMessagePart.output
      );
    },
  });

  useEffect(() => {
    messagesRef.current = chat.messages;
  }, [chat.messages]);

  useEffect(() => {
    if (openChatResponse?.messages && !isLoading && chatId) {
      chat.setMessages(openChatResponse.messages as UIMessage[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isLoading, openChatResponse?.messages]);

  const runtime = useAISDKRuntime(chat);
  runtimeRef.current = runtime;

  const createNewChat = useCallback(async () => {
    const oldChatId = chatId;

    try {
      chat.stop();

      if (oldChatId) {
        const context = getBuilderState();
        if (context?.selectedStep && context?.flowVersion) {
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
  }, [chatId, chat, onChatIdChange, getBuilderState]);

  return {
    runtime,
    isLoading,
    createNewChat,
  };
};
