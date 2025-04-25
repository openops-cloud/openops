import { authenticationSession } from '@/app/lib/authentication-session';
import { Message, useChat } from '@ai-sdk/react';
import {
  AI_CHAT_CONTAINER_SIZES,
  AiChatContainer,
  cn,
} from '@openops/components/ui';
import { FlowVersion, OpenChatResponse } from '@openops/shared';
import { nanoid } from 'nanoid';
import { useEffect, useRef, useState } from 'react';
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

  return (
    <AiChatContainer
      parentHeight={middlePanelSize.height}
      showAiChat={showAiChat}
      onCloseClick={() => dispatch({ type: 'AICHAT_CLOSE_CLICK' })}
      containerSize={aiContainerSize}
      toggleContainerSizeState={() => dispatch({ type: 'AICHAT_TOGGLE_SIZE' })}
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
