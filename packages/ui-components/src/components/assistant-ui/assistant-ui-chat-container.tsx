import {
  AssistantRuntime,
  AssistantRuntimeProvider,
} from '@assistant-ui/react';
import { t } from 'i18next';
import { AssistantTopBar, AssistantTopBarProps } from './assistant-top-bar';
import { Thread, ThreadProps } from './thread';
import { ThreadWelcomeProvider } from './thread-welcome-context';

type AssistantUiChatContainerProps = {
  runtime: AssistantRuntime;
} & AssistantTopBarProps &
  ThreadProps;

const AssistantUiChatContainer = ({
  onClose,
  onNewChat,
  enableNewChat,
  runtime,
  title,
  availableModels,
  selectedModel,
  onModelSelected,
  isModelSelectorLoading,
  theme,
  children,
}: AssistantUiChatContainerProps) => {
  return (
    <div className="h-full w-full flex flex-col bg-background rounded-sm overflow-hidden">
      <AssistantTopBar
        onClose={onClose}
        onNewChat={onNewChat}
        enableNewChat={enableNewChat}
        title={title}
      >
        {children}
      </AssistantTopBar>
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadWelcomeProvider greeting={t('How can I help you today?')}>
          <Thread
            availableModels={availableModels}
            onModelSelected={onModelSelected}
            selectedModel={selectedModel}
            isModelSelectorLoading={isModelSelectorLoading}
            theme={theme}
          />
        </ThreadWelcomeProvider>
      </AssistantRuntimeProvider>
    </div>
  );
};

AssistantUiChatContainer.displayName = 'AssistantUiChatContainer';
export { AssistantUiChatContainer };
