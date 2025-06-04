import { UseChatHelpers } from '@ai-sdk/react';
import { t } from 'i18next';
import { throttle } from 'lodash-es';
import { Bot } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useRef } from 'react';
import { useIntersection } from 'react-use';
import { cn } from '../../lib/cn';
import { AI_CHAT_SCROLL_DELAY } from '../../lib/constants';
import { ScrollArea } from '../../ui/scroll-area';
import { BoxSize, ResizableArea } from '../resizable-area';
import { AiChatInput } from './ai-chat-input';
import { AiChatSizeTogglers } from './ai-chat-size-togglers';
import { AiModelSelectorProps } from './ai-model-selector';
import { AI_CHAT_CONTAINER_SIZES, AiAssistantChatSizeState } from './types';

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
  status?: string;
  lastUserMessageRef: React.RefObject<HTMLDivElement>;
} & Pick<UseChatHelpers, 'input' | 'handleInputChange' | 'handleSubmit'> &
  AiModelSelectorProps;

export const CHAT_MIN_WIDTH = 375;
export const PARENT_INITIAL_HEIGHT_GAP = 220;
export const PARENT_MAX_HEIGHT_GAP = 95;

const getLastUserMessageId = (messages: { id: string; role: string }[]) => {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
  return lastUserIndex !== -1 ? messages[lastUserIndex].id : null;
};

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
}: AiAssistantChatContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef<boolean>(false);
  const userHasScrolled = useRef<boolean>(false);
  const lastUserMessageId = useRef<string | null>(
    getLastUserMessageId(messages),
  );

  const streamingEndRef = useRef<HTMLDivElement>(null);

  const isLastUserMessageVisible = useIntersection(lastUserMessageRef, {
    root: scrollViewportRef?.current,
    rootMargin: '0px',
    threshold: 1,
  });

  // scroll to the last user message, when getting a new user message
  useEffect(() => {
    if (messages.length) {
      const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
      if (
        lastUserIndex !== -1 &&
        lastUserMessageId.current !== messages[lastUserIndex].id
      ) {
        lastUserMessageId.current = messages[lastUserIndex].id;
        lastUserMessageRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }
    }
  }, [lastUserMessageRef, messages]);

  // auto-scroll to the AI when streaming
  useEffect(() => {
    if (
      status === 'streaming' &&
      isLastUserMessageVisible?.isIntersecting &&
      streamingEndRef.current
    ) {
      streamingEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }, [status, isLastUserMessageVisible, messages]);

  // track user scroll interaction
  useEffect(() => {
    const scrollEl = scrollViewportRef.current;
    if (!scrollEl) return;
    const handleScroll = () => {
      userHasScrolled.current = true;
    };
    scrollEl.addEventListener('scroll', handleScroll);
    return () => {
      scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, [scrollViewportRef]);

  // when messages length changes, reset userHasScrolled and hasAutoScrolled
  useEffect(() => {
    userHasScrolled.current = false;
    hasAutoScrolled.current = false;
  }, [messages.length]);

  // initial scroll to the bottom when the chat is opened
  useEffect(() => {
    if (
      !hasAutoScrolled.current &&
      !isEmpty &&
      showAiChat &&
      !!children &&
      !userHasScrolled.current
    ) {
      setTimeout(() => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollTo({
            top: scrollViewportRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
        hasAutoScrolled.current = true;
      }, AI_CHAT_SCROLL_DELAY);
      return;
    }
  }, [isEmpty, showAiChat, children, isLastUserMessageVisible]);

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
            </div>
            <div className="flex items-center gap-2">
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
                className="h-full w-full"
                viewPortRef={scrollViewportRef}
              >
                <div className="h-full w-full px-6 flex flex-col">
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
                    <>
                      {children}
                      <div ref={streamingEndRef} className="h-1" />
                    </>
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
