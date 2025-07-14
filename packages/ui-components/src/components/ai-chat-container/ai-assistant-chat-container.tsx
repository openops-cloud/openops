import { UseChatHelpers } from '@ai-sdk/react';
import { ReactNode, useEffect, useRef } from 'react';
import { cn } from '../../lib/cn';
import { AIChatMessageRole } from '../ai-chat-messages';
import { BoxSize, ResizableArea } from '../resizable-area';
import { ChatStatus } from './ai-chat-input';
import { AiModelSelectorProps } from './ai-model-selector';
import { AiScopeItem } from './ai-scope-selector';
import { getLastUserMessageId } from './ai-scroll-helpers';
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
  aiChatSize,
  showAiChat,
  isEmpty = true,
  className,
  children,
  messages = [],
  handleSubmit,
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
        {children}
      </ResizableArea>
    </div>
  );
};

AiAssistantChatContainer.displayName = 'AiAssistantChatContainer';
export { AiAssistantChatContainer };
