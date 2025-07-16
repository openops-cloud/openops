import { UseChatHelpers } from '@ai-sdk/react';
import { t } from 'i18next';
import { Bot, X as XIcon } from 'lucide-react';
import { ReactNode, useEffect, useRef } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { AIChatMessageRole } from '../ai-chat-messages';
import { NewAiChatButton } from '../new-ai-chat-button';
import { AiChatInput, ChatStatus } from './ai-chat-input';
import { AiModelSelectorProps } from './ai-model-selector';
import { AiScopeItem } from './ai-scope-selector';
import { getLastUserMessageId } from './ai-scroll-helpers';
import {
  useScrollToBottomOnOpen,
  useScrollToLastUserMessage,
} from './use-ai-chat-scroll';

type AiAssistantBuilderChatContainerProps = {
  showAiChat: boolean;
  onCloseClick: () => void;
  onCreateNewChatClick: () => void;
  isEmpty: boolean;
  className?: string;
  children?: ReactNode;
  messages?: { id: string; role: string }[];
  status?: ChatStatus;
  lastUserMessageRef: React.RefObject<HTMLDivElement>;
  lastAssistantMessageRef: React.RefObject<HTMLDivElement>;
  scopeOptions?: AiScopeItem[];
  selectedScopeItems?: AiScopeItem[];
  onScopeSelected?: (scope: AiScopeItem) => void;
  onAiScopeItemRemove?: (id: string) => void;
} & Pick<UseChatHelpers, 'input' | 'handleInputChange' | 'handleSubmit'> &
  AiModelSelectorProps;

const AiAssistantBuilderChatContainer = ({
  showAiChat,
  onCloseClick,
  onCreateNewChatClick,
  isEmpty = true,
  className,
  children,
  messages = [],
  handleInputChange,
  handleSubmit,
  input,
  availableModels,
  selectedModel,
  onModelSelected,
  isModelSelectorLoading,
  status,
  scopeOptions,
  onAiScopeItemRemove,
  selectedScopeItems,
  onScopeSelected,
}: AiAssistantBuilderChatContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef<boolean>(false);
  const streamingEndRef = useRef<HTMLDivElement>(null);
  const lastUserMessageId = useRef<string | null>(
    getLastUserMessageId(messages),
  );
  const lastUserMessageIndex = useRef<number | null>(null);

  useEffect(() => {
    if (showAiChat) {
      if (lastUserMessageIndex.current === null && messages.length) {
        lastUserMessageIndex.current = messages
          .map((m) => m.role)
          .lastIndexOf(AIChatMessageRole.user);
      }
    } else {
      lastUserMessageIndex.current = null;
    }
  }, [showAiChat, messages]);

  useScrollToLastUserMessage({
    messages,
    showAiChat,
    scrollViewportRef,
    lastUserMessageId,
    streamingEndRef,
  });

  useScrollToBottomOnOpen({
    isEmpty,
    showAiChat,
    messages,
    hasAutoScrolled,
    scrollViewportRef,
  });
  return (
    <div
      ref={containerRef}
      className={cn(
        'h-full flex-1 flex z-50 overflow-x-hidden dark:text-primary bg-background rounded-md',
        {
          hidden: !showAiChat,
        },
        className,
      )}
      onKeyDown={(e) => {
        if (
          document.activeElement === containerRef.current &&
          e.key === 'Enter'
        ) {
          e.preventDefault();
          e.stopPropagation();
          handleSubmit();
        }
      }}
    >
      <div className="h-full w-full flex flex-col">
        <div className="flex justify-between items-center px-4 py-2 gap-2 text-md dark:text-primary font-bold border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="size-8 flex justify-center items-center bg-background bg-gradient-to-b from-ring/40 to-primary-200/40 rounded-xl">
              <Bot size={20} />
            </div>
            {t('AI Assistant')}
          </div>
          <div className="flex items-center gap-2">
            <NewAiChatButton
              enableNewChat={!isEmpty}
              onNewChatClick={onCreateNewChatClick}
            />
            <Button
              size="icon"
              variant="basic"
              onClick={(e) => {
                e.stopPropagation();
                onCloseClick();
              }}
              className="text-outline"
            >
              <XIcon size={20} />
            </Button>
          </div>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="py-4 flex flex-col h-full">
            <ScrollArea
              className="h-full w-full flex-1"
              viewPortRef={scrollViewportRef}
            >
              <div className="h-full w-full px-6 flex flex-col flex-1">
                {isEmpty ? (
                  <div
                    className={
                      'flex-1 flex flex-col items-center justify-center gap-1'
                    }
                  >
                    <span className="inline-block max-w-[220px] text-center dark:text-primary text-base font-bold leading-[25px]">
                      {t('Welcome to')}
                      <br />
                      {t('OpenOps AI Assistant!')}
                    </span>
                    <span className="text-[14px] font-normal">
                      {t('How can I help you today?')}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {children}
                    <div ref={streamingEndRef} id="streaming-end" />
                  </div>
                )}
              </div>
            </ScrollArea>
            <AiChatInput
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
              availableModels={availableModels}
              selectedModel={selectedModel}
              onModelSelected={onModelSelected}
              isModelSelectorLoading={isModelSelectorLoading}
              placeholder={t('Type your question here…')}
              status={status}
              scopeOptions={scopeOptions}
              onAiScopeItemRemove={onAiScopeItemRemove}
              selectedScopeItems={selectedScopeItems}
              onScopeSelected={onScopeSelected}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

AiAssistantBuilderChatContainer.displayName = 'AiAssistantBuilderChatContainer';
export { AiAssistantBuilderChatContainer };
