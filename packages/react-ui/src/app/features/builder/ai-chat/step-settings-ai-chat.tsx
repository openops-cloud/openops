import {
  AI_CHAT_CONTAINER_SIZES,
  AiCliChatContainerSizeState,
  cn,
  StepSettingsAiChatContainer,
} from '@openops/components/ui';
import { FlowVersion } from '@openops/shared';
import { useCallback } from 'react';
import { useAiModelSelector } from '../../ai/lib/ai-model-selector-hook';
import { useBuilderStateContext } from '../builder-hooks';
import { DataSelectorSizeState } from '../data-selector/data-selector-size-togglers';
import { useStepSettingsAiChat } from './lib/step-settings-ai-chat-hook';
import { StepSettingsAiConversation } from './step-settings-ai-conversation';

type StepSettingsAiChatProps = {
  middlePanelSize: {
    width: number;
    height: number;
  };
  selectedStep: string;
  flowVersion: FlowVersion;
};

const StepSettingsAiChat = ({
  middlePanelSize,
  selectedStep,
  flowVersion,
}: StepSettingsAiChatProps) => {
  const [
    { showDataSelector, dataSelectorSize, aiContainerSize, showAiChat },
    dispatch,
  ] = useBuilderStateContext((state) => [
    state.midpanelState,
    state.applyMidpanelAction,
  ]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    onNewChatClick,
    enableNewChat,
    isOpenAiChatPending,
    isEmpty,
  } = useStepSettingsAiChat(flowVersion, selectedStep);

  const {
    selectedModel,
    availableModels,
    onModelSelected,
    isLoading: isModelSelectorLoading,
  } = useAiModelSelector();

  const onToggleContainerSizeState = useCallback(
    (size: AiCliChatContainerSizeState) => {
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
        ] as AiCliChatContainerSizeState[]
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
      isEmpty={isEmpty}
      stepName={selectedStep}
      availableModels={availableModels}
      selectedModel={selectedModel}
      onModelSelected={onModelSelected}
      isModelSelectorLoading={isModelSelectorLoading}
    >
      <StepSettingsAiConversation
        messages={messages}
        status={status}
        isPending={isOpenAiChatPending}
      />
    </StepSettingsAiChatContainer>
  );
};

StepSettingsAiChat.displayName = 'StepSettingsAiChat';
export { StepSettingsAiChat };
