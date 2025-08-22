import { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { BoxSize, ResizableArea } from '../resizable-area';
import { AI_CHAT_CONTAINER_SIZES, AiAssistantChatSizeState } from './types';

type AssistantUiResizableContainerProps = {
  dimensions: BoxSize;
  setDimensions: (dimensions: BoxSize) => void;
  maxSize: BoxSize;
  aiChatSize: AiAssistantChatSizeState;
  showAiChat: boolean;
  minWidth: number;
  className?: string;
  children?: ReactNode;
};

const AssistantUiResizableContainer = ({
  dimensions,
  setDimensions,
  maxSize,
  aiChatSize,
  showAiChat,
  className,
  minWidth,
  children,
}: AssistantUiResizableContainerProps) => {
  return (
    <div
      className={cn(
        'absolute bottom-[0px] z-50 overflow-x-hidden dark:text-primary bg-background shadow-editor rounded-md',
        {
          hidden: !showAiChat,
        },
        className,
      )}
      style={{
        minWidth: `${minWidth}px`,
      }}
    >
      <ResizableArea
        dimensions={dimensions}
        setDimensions={setDimensions}
        minWidth={minWidth}
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

AssistantUiResizableContainer.displayName = 'AssistantUiResizableContainer';
export { AssistantUiResizableContainer };
