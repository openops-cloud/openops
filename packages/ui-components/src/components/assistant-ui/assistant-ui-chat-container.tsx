import {
  AssistantRuntime,
  AssistantRuntimeProvider,
} from '@assistant-ui/react';
import { ReactNode, useMemo } from 'react';
import { MarkdownCodeVariations } from '../custom';
import { AssistantTopBar, AssistantTopBarProps } from './assistant-top-bar';
import { Thread, ThreadProps } from './thread';
import { ThreadExtraContextProvider } from './thread-extra-context';

type AssistantUiChatContainerProps = {
  runtime: AssistantRuntime;
  toolComponents?: Record<string, ReactNode>;
  handleInject?: (codeContent: string) => void;
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
  handleInject,
  toolComponents,
}: AssistantUiChatContainerProps) => {
  const codeVariation = useMemo(() => {
    return handleInject
      ? MarkdownCodeVariations.WithCopyAndInject
      : MarkdownCodeVariations.WithCopy;
  }, [handleInject]);

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      <AssistantTopBar
        onClose={onClose}
        onNewChat={onNewChat}
        enableNewChat={enableNewChat}
        title={title}
      >
        {children}
      </AssistantTopBar>
      <AssistantRuntimeProvider runtime={runtime}>
        {Object.entries(toolComponents || {}).map(([key, tool]) => (
          <div key={key}>{tool}</div>
        ))}
        <ThreadExtraContextProvider
          codeVariation={codeVariation}
          handleInject={handleInject}
        >
          <Thread
            availableModels={availableModels}
            onModelSelected={onModelSelected}
            selectedModel={selectedModel}
            isModelSelectorLoading={isModelSelectorLoading}
            theme={theme}
          />
        </ThreadExtraContextProvider>
      </AssistantRuntimeProvider>
    </div>
  );
};

AssistantUiChatContainer.displayName = 'AssistantUiChatContainer';
export { AssistantUiChatContainer };
