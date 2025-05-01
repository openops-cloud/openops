import { authenticationSession } from '@/app/lib/authentication-session';
import { Message, useChat } from '@ai-sdk/react';
import {
  AI_CHAT_CONTAINER_SIZES,
  AiChatContainer,
  AiChatContainerSizeState,
  cn,
} from '@openops/components/ui';
import { FlowVersion, OpenChatResponse } from '@openops/shared';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBuilderStateContext } from '../builder-hooks';
import { DataSelectorSizeState } from '../data-selector/data-selector-size-togglers';
import { Conversation } from './conversation';

type AiChatProps = {
  middlePanelSize: {
    width: number;
    height: number;
  };
  selectedStep: string | null;
  flowVersion: FlowVersion;
};

const AiChat = ({
  middlePanelSize,
  selectedStep,
  flowVersion,
}: AiChatProps) => {
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

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
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
    <AiChatContainer
      parentHeight={middlePanelSize.height}
      parentWidth={middlePanelSize.width}
      showAiChat={showAiChat}
      onCloseClick={onCloseClick}
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
    </AiChatContainer>
  );
};

AiChat.displayName = 'Chat';
export { AiChat };
