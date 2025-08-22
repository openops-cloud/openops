import { useTheme } from '@/app/common/providers/theme-provider';
import {
  AI_CHAT_CONTAINER_SIZES,
  AiCliChatContainerSizeState,
  cn,
  StepSettingsAssistantUiChatContainer,
} from '@openops/components/ui';
import { FlowVersion } from '@openops/shared';
import { useCallback } from 'react';
import { useAiModelSelector } from '../../ai/lib/ai-model-selector-hook';
import { useStepSettingsAssistantChat } from '../assistant-ui/hooks/use-step-settings-assistant-chat';
import { useBuilderStateContext } from '../builder-hooks';
import { DataSelectorSizeState } from '../data-selector/data-selector-size-togglers';

type StepSettingsAssistantUiChatProps = {
  middlePanelSize: {
    width: number;
    height: number;
  };
  selectedStep: string;
  flowVersion: FlowVersion;
};

const StepSettingsAssistantUiChat = ({
  middlePanelSize,
  selectedStep,
  flowVersion,
}: StepSettingsAssistantUiChatProps) => {
  const { theme } = useTheme();

  const [
    { showDataSelector, dataSelectorSize, aiContainerSize, showAiChat },
    dispatch,
  ] = useBuilderStateContext((state) => [
    state.midpanelState,
    state.applyMidpanelAction,
  ]);

  const { runtime, createNewChat, onInject } = useStepSettingsAssistantChat(
    flowVersion,
    // selectedStep,
  );

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

  const {
    selectedModel,
    availableModels,
    onModelSelected,
    isLoading: isModelSelectorLoading,
  } = useAiModelSelector();

  const showFullWidth =
    showDataSelector && dataSelectorSize === DataSelectorSizeState.EXPANDED;

  return (
    <StepSettingsAssistantUiChatContainer
      parentHeight={middlePanelSize.height}
      parentWidth={middlePanelSize.width}
      showAiChat={showAiChat}
      onCloseClick={onCloseClick}
      handleInject={onInject}
      onNewChatClick={createNewChat}
      containerSize={aiContainerSize}
      showFullWidth={showFullWidth}
      toggleContainerSizeState={onToggleContainerSizeState}
      onModelSelected={onModelSelected}
      isModelSelectorLoading={isModelSelectorLoading}
      selectedModel={selectedModel}
      availableModels={availableModels}
      theme={theme}
      runtime={runtime}
      className={cn('right-0 static', {
        'children:transition-none':
          showDataSelector &&
          showAiChat &&
          aiContainerSize === AI_CHAT_CONTAINER_SIZES.COLLAPSED &&
          dataSelectorSize === DataSelectorSizeState.DOCKED,
      })}
    ></StepSettingsAssistantUiChatContainer>
  );
};

StepSettingsAssistantUiChat.displayName = 'StepSettingsAssistantUiChat';
export { StepSettingsAssistantUiChat };
