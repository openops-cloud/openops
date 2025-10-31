import {
  AssistantRuntime,
  AssistantRuntimeProvider,
} from '@assistant-ui/react';
import { SourceCode } from '@openops/shared';
import { ReactNode, useMemo } from 'react';
import { MarkdownCodeVariations } from '../custom';
import { AssistantTopBar, AssistantTopBarProps } from './assistant-top-bar';
import { Thread, ThreadProps } from './thread';
import { ThreadExtraContextProvider } from './thread-extra-context';

type AssistantUiChatContainerProps = {
  runtime: AssistantRuntime;
  toolComponents?: Record<string, ReactNode>;
  handleInject?: (codeContent: string | SourceCode) => void;
} & AssistantTopBarProps &
  ThreadProps;

const AssistantUiChatContainer = ({
  onClose,
  onNewChat,
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
  onToggleHistory,
  isHistoryOpen,
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
        title={title}
        onToggleHistory={onToggleHistory}
        isHistoryOpen={isHistoryOpen}
      >
        <></>
      </AssistantTopBar>
      {isHistoryOpen ? (
        <div className="flex-1 overflow-hidden bg-secondary">{children}</div>
      ) : (
        <AssistantRuntimeProvider runtime={runtime}>
          {Object.entries(toolComponents || {}).map(([key, tool]) => (
            <div key={key}>{tool}</div>
          ))}
          <ThreadExtraContextProvider
            codeVariation={codeVariation}
            handleInject={handleInject}
          >
            <div className="flex-1 overflow-hidden">
              <Thread
                availableModels={availableModels}
                onModelSelected={onModelSelected}
                selectedModel={selectedModel}
                isModelSelectorLoading={isModelSelectorLoading}
                theme={theme}
              />
            </div>
          </ThreadExtraContextProvider>
        </AssistantRuntimeProvider>
      )}
    </div>
  );
};

AssistantUiChatContainer.displayName = 'AssistantUiChatContainer';
export { AssistantUiChatContainer };
