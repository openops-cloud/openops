import { authenticationSession } from '@/app/lib/authentication-session';
import { Message, useChat } from '@ai-sdk/react';
import {
  AI_CHAT_CONTAINER_SIZES,
  AiChatContainerSizeState,
  cn,
  StepSettingsAiChatContainer,
  toast,
} from '@openops/components/ui';
import { flowHelper, FlowVersion, OpenChatResponse } from '@openops/shared';
import { useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBuilderStateContext } from '../builder-hooks';
import { DataSelectorSizeState } from '../data-selector/data-selector-size-togglers';
import { Conversation } from './conversation';
import { aiChatApi } from './lib/chat-api';

type StepSettingsAiChatProps = {
  middlePanelSize: {
    width: number;
    height: number;
  };
  selectedStep: string | null;
  flowVersion: FlowVersion;
};

const StepSettingsAiChat = ({
  middlePanelSize,
  selectedStep,
  flowVersion,
}: StepSettingsAiChatProps) => {
  const [
    {
      showDataSelector,
      dataSelectorSize,
      aiContainerSize,
      showAiChat,
      aiChatProperty,
    },
    dispatch,
  ] = useBuilderStateContext((state) => [
    state.midpanelState,
    state.applyMidpanelAction,
  ]);

  const conversationRef = useRef<OpenChatResponse | null>(null);
  const [chatSessionKey, setChatSessionKey] = useState<string>(nanoid());

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
      chatId: conversationRef.current?.chatId,
    },
    initialMessages: conversationRef.current?.messages as Message[],
    experimental_prepareRequestBody: () => ({
      chatId: conversationRef.current?.chatId,
      message: input,
    }),
    headers: {
      Authorization: `Bearer ${authenticationSession.getToken()}`,
    },
  });

  useEffect(() => {
    conversationRef.current = null;
    setChatSessionKey(nanoid());
  }, [selectedStep]);

  const onToggleContainerSizeState = useCallback(
    (size: AiChatContainerSizeState) => {
      switch (size) {
        case AI_CHAT_CONTAINER_SIZES.DOCKED:
          dispatch({ type: 'AICHAT_DOCK_CLICK' });
          return;
        case AI_CHAT_CONTAINER_SIZES.EXPANDED:
          dispatch({ type: 'AICHAT_EXPAND_CLICK' });
          break;
        case AI_CHAT_CONTAINER_SIZES.COLLAPSED:
          dispatch({ type: 'AICHAT_MIMIZE_CLICK' });
          break;
      }
    },
    [dispatch],
  );

  const onCloseClick = useCallback(() => {
    dispatch({ type: 'AICHAT_CLOSE_CLICK' });
  }, [dispatch]);

  const queryClient = useQueryClient();

  const [enableNewChat, setEnableNewChat] = useState(true);

  const onNewChatClick = useCallback(async () => {
    const chatId = conversationRef.current?.chatId;
    if (!selectedStep || !chatId) {
      return;
    }

    setEnableNewChat(false);

    try {
      await aiChatApi.delete(chatId);

      const stepDetails = flowHelper.getStep(flowVersion, selectedStep);
      const blockName = stepDetails?.settings?.blockName;

      await queryClient.invalidateQueries({
        queryKey: ['openChat', flowVersion.flowId, blockName, selectedStep],
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
  }, [flowVersion, queryClient, selectedStep, setMessages]);

  const onToggle = useCallback(() => {
    if (
      (
        [
          AI_CHAT_CONTAINER_SIZES.DOCKED,
          AI_CHAT_CONTAINER_SIZES.EXPANDED,
        ] as AiChatContainerSizeState[]
      ).includes(aiContainerSize)
    ) {
      return;
    }

    if (dataSelectorSize === AI_CHAT_CONTAINER_SIZES.EXPANDED) {
      onToggleContainerSizeState(AI_CHAT_CONTAINER_SIZES.EXPANDED);
    } else {
      onToggleContainerSizeState(AI_CHAT_CONTAINER_SIZES.DOCKED);
    }
  }, [aiContainerSize, dataSelectorSize, onToggleContainerSizeState]);

  return (
    <StepSettingsAiChatContainer
      parentHeight={middlePanelSize.height}
      parentWidth={middlePanelSize.width}
      showAiChat={showAiChat}
      onCloseClick={onCloseClick}
      enableNewChat={enableNewChat}
      onNewChatClick={onNewChatClick}
      containerSize={aiContainerSize}
      onToggle={onToggle}
      toggleContainerSizeState={onToggleContainerSizeState}
      className={cn('right-0 static', {
        'children:transition-none':
          showDataSelector &&
          showAiChat &&
          aiContainerSize === AI_CHAT_CONTAINER_SIZES.COLLAPSED &&
          dataSelectorSize === DataSelectorSizeState.DOCKED,
      })}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      input={input}
    >
      {selectedStep && showAiChat && aiChatProperty && (
        <Conversation
          stepName={selectedStep}
          flowVersion={flowVersion}
          property={aiChatProperty}
          onConversationRetrieved={(conversation) =>
            (conversationRef.current = conversation)
          }
          messages={messages}
          status={status}
        />
      )}
    </StepSettingsAiChatContainer>
  );
};

StepSettingsAiChat.displayName = 'StepSettingsAiChat';
export { StepSettingsAiChat };
