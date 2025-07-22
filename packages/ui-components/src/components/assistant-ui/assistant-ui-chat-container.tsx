import {
  AssistantRuntime,
  AssistantRuntimeProvider,
} from '@assistant-ui/react';
import { t } from 'i18next';
import { AiChatHeader, AiChatHeaderProps } from './ai-chat-header';
import { Thread } from './thread';
import { ThreadWelcomeProvider } from './thread-welcome-context';

type AssistantUiChatContainerProps = {
  runtime: AssistantRuntime;
} & AiChatHeaderProps;

const AssistantUiChatContainer = ({
  onClose,
  onNewChat,
  enableNewChat,
  runtime,
  children,
}: AssistantUiChatContainerProps) => {
  return (
    <div className="h-full w-full flex flex-col bg-background rounded-sm overflow-hidden">
      <AiChatHeader
        onClose={onClose}
        onNewChat={onNewChat}
        enableNewChat={enableNewChat}
      >
        {children}
      </AiChatHeader>
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
