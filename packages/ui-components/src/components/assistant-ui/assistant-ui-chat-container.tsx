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
import { ConnectionStatusProps } from './types';

type AssistantUiChatContainerProps = {
  runtime: AssistantRuntime;
  toolComponents?: Record<string, ReactNode>;
  handleInject?: (codeContent: string | SourceCode) => void;
  isTitleDefault?: boolean;
} & ConnectionStatusProps &
  AssistantTopBarProps &
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
  onHistoryOpenChange,
  isHistoryOpen,
  isShowingSlowWarning,
  connectionError,
  chatId,
  isTitleDefault,
}: AssistantUiChatContainerProps) => {
  const codeVariation = useMemo(() => {
    return handleInject
      ? MarkdownCodeVariations.WithCopyAndInject
      : MarkdownCodeVariations.WithCopy;
  }, [handleInject]);

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden relative">
      <AssistantTopBar
        onClose={onClose}
        onNewChat={onNewChat}
        title={title}
        onHistoryOpenChange={onHistoryOpenChange}
        isHistoryOpen={isHistoryOpen}
        historyContent={children}
        chatId={chatId}
        isTitleDefault={isTitleDefault}
      >
        {null}
      </AssistantTopBar>
      <AssistantRuntimeProvider runtime={runtime}>
        {Object.entries(toolComponents || {}).map(([key, tool]) => (
          <div key={key}>{tool}</div>
        ))}
        <div className="flex flex-1 overflow-hidden">
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
                isShowingSlowWarning={isShowingSlowWarning}
                connectionError={connectionError}
              />
            </div>
          </ThreadExtraContextProvider>
        </div>
      </AssistantRuntimeProvider>
    </div>
  );
};

AssistantUiChatContainer.displayName = 'AssistantUiChatContainer';
export { AssistantUiChatContainer };
