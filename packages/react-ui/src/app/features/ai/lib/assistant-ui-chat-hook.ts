import { QueryKeys } from '@/app/constants/query-keys';
import { aiAssistantChatApi } from '@/app/features/ai/lib/ai-assistant-chat-api';
import { getActionName, getBlockName } from '@/app/features/blocks/lib/utils';
import { authenticationSession } from '@/app/lib/authentication-session';
import { useChat } from '@ai-sdk/react';
import { AssistantRuntime } from '@assistant-ui/react';
import { useAISDKRuntime } from '@assistant-ui/react-ai-sdk';
import { toast } from '@openops/components/ui';
import { flowHelper } from '@openops/shared';
import { getFrontendToolDefinitions } from '@openops/ui-kit';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport, ToolSet, UIMessage } from 'ai';
import { t } from 'i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { aiChatApi } from '../../builder/ai-chat/lib/chat-api';
import { getBuilderStore } from '../../builder/builder-state-provider';
import { aiAssistantChatHistoryApi } from './ai-assistant-chat-history-api';
import { aiSettingsHooks } from './ai-settings-hooks';
import { buildQueryKey } from './chat-utils';
import { createAdditionalContext } from './enrich-context';
import { ChatMode, UseAssistantChatProps } from './types';

export const MIN_MESSAGES_BEFORE_NAME_GENERATION = 1;

export const useAssistantChat = ({
  chatId,
  onChatIdChange,
  chatMode,
  context,
}: UseAssistantChatProps) => {
  const runtimeRef = useRef<AssistantRuntime | null>(null);
  const frontendTools = useMemo(
    () => getFrontendToolDefinitions() as ToolSet,
    [],
  );
  const qc = useQueryClient();
  const hasAttemptedNameGenerationRef = useRef<Record<string, boolean>>({});

  const [provider, setProvider] = useState<string | undefined>();
  const [model, setModel] = useState<string | undefined>();

  const { flowId, flowVersionId, runId, selectedStep, showSettingsAIChat } =
    context ?? {};

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

  const { data: activeAiSettings } = aiSettingsHooks.useActiveAiSettings();

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

  const {
    data: openChatResponse,
    isLoading,
    refetch,
  } = useQuery({
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
          const stepId =
            flowHelper.getStep(context.flowVersion, context.selectedStep)?.id ??
            context.selectedStep;

          return await aiChatApi.open(
            flowId,
            getBlockName(stepDetails),
            stepId,
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

  useEffect(() => {
    if (openChatResponse?.provider && openChatResponse?.model) {
      setProvider(openChatResponse.provider);
      setModel(openChatResponse.model);
    }
  }, [openChatResponse?.provider, openChatResponse?.model]);

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
    additionalContext,
  });

  const messagesRef = useRef<UIMessage[]>([]);

  useEffect(() => {
    bodyRef.current = {
      chatId,
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
      prepareSendMessagesRequest: ({ messages, requestMetadata }) => ({
        body: {
          ...(requestMetadata as Record<string, unknown>),
          ...bodyRef.current,
          message: messages.at(-1),
          tools: runtimeRef.current?.thread?.getModelContext()?.tools ?? {},
        },
      }),
    }),
    onError: (error) => {
      console.error('chat error', error);

      if (
        error?.message?.toLowerCase()?.includes('network error') ||
        error?.message?.toLowerCase()?.includes('network timeout') ||
        String(error)?.toLowerCase()?.includes('network error') ||
        String(error)?.toLowerCase()?.includes('network timeout')
      ) {
        // we don't want to show a toast as we show directly in the chat UI
        return;
      }

      const errorToast = {
        title: t('AI Chat Error'),
        description: t(
          'There was an error while processing your request, please try again or open a new chat',
        ),
        variant: 'destructive' as const,
        // 1 week
        duration: 604800000,
      };
      toast(errorToast);
    },
    onFinish: async () => {
      if (!chatId || hasAttemptedNameGenerationRef.current[chatId]) {
        return;
      }

      if (messagesRef.current.length >= MIN_MESSAGES_BEFORE_NAME_GENERATION) {
        try {
          hasAttemptedNameGenerationRef.current[chatId] = true;
          await aiAssistantChatHistoryApi.generateName(chatId);
          qc.invalidateQueries({ queryKey: [QueryKeys.assistantHistory] });
        } catch (error) {
          console.error('Failed to generate chat name', error);
          hasAttemptedNameGenerationRef.current[chatId] = false;
          qc.invalidateQueries({ queryKey: [QueryKeys.assistantHistory] });
        }
      }
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

  const lastConnectionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const currentConnection = activeAiSettings?.connection;

    if (lastConnectionRef.current === undefined) {
      lastConnectionRef.current = currentConnection;
      return;
    }

    if (
      chatId &&
      currentConnection &&
      lastConnectionRef.current !== currentConnection
    ) {
      lastConnectionRef.current = currentConnection;
      refetch();
    }
  }, [activeAiSettings?.connection, chatId, chatMode, refetch]);

  const createNewChat = useCallback(async () => {
    const oldChatId = chatId;

    try {
      chat.stop();

      if (oldChatId) {
        const context = getBuilderState();
        if (
          context?.selectedStep &&
          context?.flowVersion &&
          chatMode === ChatMode.StepSettings
        ) {
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
  }, [chatId, chat, getBuilderState, chatMode, onChatIdChange]);

  return {
    runtime,
    isLoading,
    createNewChat,
    provider,
    model,
    chatId,
    chatStatus: chat.status,
  };
};
