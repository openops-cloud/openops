import { useTheme } from '@/app/common/providers/theme-provider';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import {
  AI_CHAT_CONTAINER_SIZES,
  AiCliChatContainerSizeState,
  cn,
  StepSettingsAiChatContainer,
  ThreadWelcomeProvider,
} from '@openops/components/ui';
import { FlowVersion } from '@openops/shared';
import { t } from 'i18next';
import { useCallback } from 'react';
import { AssistantThreadWithInjection } from '.';
import { useBuilderStateContext } from '../builder-hooks';
import { DataSelectorSizeState } from '../data-selector/data-selector-size-togglers';
import { useStepSettingsAssistantChat } from './hooks/use-step-settings-assistant-chat';

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
    selectedStep,
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

  return (
    <StepSettingsAiChatContainer
      parentHeight={middlePanelSize.height}
      parentWidth={middlePanelSize.width}
      showAiChat={showAiChat}
      onCloseClick={onCloseClick}
      enableNewChat={true}
      onNewChatClick={createNewChat}
      containerSize={aiContainerSize}
      toggleContainerSizeState={onToggleContainerSizeState}
      className={cn('right-0 static', {
        'children:transition-none':
          showDataSelector &&
          showAiChat &&
          aiContainerSize === AI_CHAT_CONTAINER_SIZES.COLLAPSED &&
          dataSelectorSize === DataSelectorSizeState.DOCKED,
      })}
    >
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadWelcomeProvider greeting={t('How can I help you?')}>
          <AssistantThreadWithInjection onInject={onInject} theme={theme} />
        </ThreadWelcomeProvider>
      </AssistantRuntimeProvider>
    </StepSettingsAiChatContainer>
  );
};

StepSettingsAssistantUiChat.displayName = 'StepSettingsAssistantUiChat';
export { StepSettingsAssistantUiChat };
