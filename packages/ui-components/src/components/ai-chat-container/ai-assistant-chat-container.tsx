import { UseChatHelpers } from '@ai-sdk/react';
import { t } from 'i18next';
import { Bot } from 'lucide-react';
import { ReactNode, useEffect, useRef } from 'react';
import { cn } from '../../lib/cn';
import { ScrollArea } from '../../ui/scroll-area';
import { AIChatMessageRole } from '../ai-chat-messages';
import { BoxSize, ResizableArea } from '../resizable-area';
import { AiChatInput, ChatStatus } from './ai-chat-input';
import { AiChatSizeTogglers } from './ai-chat-size-togglers';
import { AiModelSelectorProps } from './ai-model-selector';
import { AiScopeItem } from './ai-scope-selector';
import { getBufferAreaHeight, getLastUserMessageId } from './ai-scroll-helpers';
import { BetaLabel } from './beta-label';
import { AI_CHAT_CONTAINER_SIZES, AiAssistantChatSizeState } from './types';
import {
  useScrollToBottomOnOpen,
  useScrollToLastUserMessage,
} from './use-ai-chat-scroll';

type AiAssistantChatContainerProps = {
  dimensions: BoxSize;
  setDimensions: (dimensions: BoxSize) => void;
  maxSize: BoxSize;
  toggleAiChatState: () => void;
  aiChatSize: AiAssistantChatSizeState;
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

export const CHAT_MIN_WIDTH = 375;
export const PARENT_INITIAL_HEIGHT_GAP = 220;
export const PARENT_MAX_HEIGHT_GAP = 95;

const AiAssistantChatContainer = ({
  dimensions,
  setDimensions,
  maxSize,
  toggleAiChatState,
  aiChatSize,
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
  lastUserMessageRef,
  lastAssistantMessageRef,
  scopeOptions,
  onAiScopeItemRemove,
  selectedScopeItems,
  onScopeSelected,
}: AiAssistantChatContainerProps) => {
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

  const height = dimensions.height ?? 0;
  const lastMsgHeight = lastUserMessageRef.current?.offsetHeight ?? 0;
  const currentBufferAreaHeight = streamingEndRef.current?.offsetHeight ?? 0;
  const lastAssistantMsgHeight =
    lastAssistantMessageRef?.current?.offsetHeight ?? 0;

  const hasNewMessage =
    lastUserMessageIndex.current !== null &&
    lastUserMessageIndex.current !== messages.length - 2;

  const bufferAreaHeight = hasNewMessage
    ? getBufferAreaHeight(
        height,
        currentBufferAreaHeight,
        lastMsgHeight,
        lastAssistantMsgHeight,
        status,
      )
    : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute bottom-[0px] z-50 overflow-x-hidden dark:text-primary bg-background shadow-editor rounded-md',
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
      <ResizableArea
        dimensions={dimensions}
        setDimensions={setDimensions}
        minWidth={CHAT_MIN_WIDTH}
        minHeight={300}
        maxWidth={maxSize.width}
        maxHeight={maxSize.height}
        isDisabled={aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED}
        resizeFrom="top-right"
        className="static p-0"
        scrollAreaClassName="pr-0"
      >
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center px-4 py-2 gap-2 text-md dark:text-primary font-bold border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="size-8 flex justify-center items-center bg-background bg-gradient-to-b from-ring/40 to-primary-200/40 rounded-xl">
                <Bot size={20} />
              </div>
              {t('AI Assistant')}
              <BetaLabel />
            </div>
            <div className="flex items-center">
              <AiChatSizeTogglers
                state={aiChatSize}
                toggleContainerSizeState={toggleAiChatState}
                onCloseClick={onCloseClick}
                enableNewChat={!isEmpty}
                onNewChatClick={onCreateNewChatClick}
              />
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
                      <div
                        ref={streamingEndRef}
                        id="streaming-end"
                        style={{
                          height: bufferAreaHeight,
                        }}
                      />
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
      </ResizableArea>
    </div>
  );
};

AiAssistantChatContainer.displayName = 'AiAssistantChatContainer';
export { AiAssistantChatContainer };
