import {
  AssistantRuntime,
  AssistantRuntimeProvider,
} from '@assistant-ui/react';
import { t } from 'i18next';
import { AssistantTopBar, AssistantTopBarProps } from './assistant-top-bar';
import { Thread } from './thread';
import { ThreadWelcomeProvider } from './thread-welcome-context';

type AssistantUiChatContainerProps = {
  runtime: AssistantRuntime;
} & AssistantTopBarProps;

const AssistantUiChatContainer = ({
  onClose,
  onNewChat,
  enableNewChat,
  runtime,
  children,
}: AssistantUiChatContainerProps) => {
  return (
    <div className="h-full w-full flex flex-col bg-background rounded-sm overflow-hidden">
      <AssistantTopBar
        onClose={onClose}
        onNewChat={onNewChat}
        enableNewChat={enableNewChat}
      >
        {children}
      </AssistantTopBar>
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadWelcomeProvider greeting={t('How can I help you today?')}>
          <Thread />
        </ThreadWelcomeProvider>
      </AssistantRuntimeProvider>
    </div>
  );
};

AssistantUiChatContainer.displayName = 'AssistantUiChatContainer';
export { AssistantUiChatContainer };
