import { UseChatHelpers } from '@ai-sdk/react';
import { t } from 'i18next';
import { Bot, Send as SendIcon } from 'lucide-react';
import { ReactNode, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { BoxSize, ResizableArea } from '../resizable-area';
import { AiChatSizeTogglers } from './ai-chat-size-togglers';
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
} & Pick<UseChatHelpers, 'input' | 'handleInputChange' | 'handleSubmit'>;

export const CHAT_MIN_WIDTH = 375;
export const PARENT_HEIGHT_GAP = 220;

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
  handleInputChange,
  handleSubmit,
  input,
}: AiAssistantChatContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

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
              <ScrollArea className="h-full w-full">
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
                    children
                  )}
                </div>
              </ScrollArea>
              <div className="w-full px-4 relative">
                <TextareaAutosize
                  className="w-full h-full min-h-12 resize-none rounded-lg border-gray-200 border-[1px] dark:text-primary-700 text-base font-normal leading-normal p-3 pr-12 outline-none dark:bg-accent"
                  minRows={1}
                  maxRows={4}
                  placeholder={t('Type your question here…')}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' && !ev.shiftKey) {
                      ev.preventDefault();
                      ev.stopPropagation();
                      handleSubmit();
                    }
                  }}
                />

                <Button
                  size="icon"
                  variant="transparent"
                  className="absolute right-7 bottom-2.5"
                  onClick={handleSubmit}
                >
                  <SendIcon
                    size={20}
                    className="text-gray-400 hover:text-gray-600"
                  />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ResizableArea>
    </div>
  );
};

AiAssistantChatContainer.displayName = 'AiAssistantChatContainer';
export { AiAssistantChatContainer };
