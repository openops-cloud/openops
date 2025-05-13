import { UseChatHelpers } from '@ai-sdk/react';
import { t } from 'i18next';
import { Send as SendIcon, Sparkles } from 'lucide-react';
import { ReactNode, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { AiChatSizeTogglers } from './ai-chat-size-togglers';
import { AI_CHAT_CONTAINER_SIZES, AiChatContainerSizeState } from './types';

type StepSettingsAiChatContainerProps = {
  parentHeight: number;
  parentWidth: number;
  showAiChat: boolean;
  onCloseClick: () => void;
  onToggle: () => void;
  containerSize: AiChatContainerSizeState;

  toggleContainerSizeState: (state: AiChatContainerSizeState) => void;
  className?: string;
  children?: ReactNode;
} & Pick<UseChatHelpers, 'input' | 'handleInputChange' | 'handleSubmit'>;

const StepSettingsAiChatContainer = ({
  parentHeight,
  parentWidth,
  showAiChat,
  onCloseClick,
  onToggle,
  containerSize,
  toggleContainerSizeState,
  className,
  children,
  handleInputChange,
  handleSubmit,
  input,
}: StepSettingsAiChatContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  let height: string;
  if (containerSize === AI_CHAT_CONTAINER_SIZES.COLLAPSED) {
    height = '0px';
  } else if (containerSize === AI_CHAT_CONTAINER_SIZES.DOCKED) {
    height = '450px';
  } else if (containerSize === AI_CHAT_CONTAINER_SIZES.EXPANDED) {
    height = `${parentHeight - 180}px`;
  } else {
    height = `${parentHeight - 100}px`;
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn(
        'absolute bottom-[0px] mr-5 mb-5 z-50 transition-all border border-solid border-outline overflow-x-hidden dark:text-primary bg-background shadow-lg rounded-md',
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
      <div
        className="text-md dark:text-primary items-center font-bold px-5 py-2 flex gap-2"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onToggle();
          }
        }}
        aria-label={t('Toggle AI Chat')}
      >
        <Sparkles />
        {t('AI Chat')}
        <div className="flex-grow" />
        <AiChatSizeTogglers
          state={containerSize}
          toggleContainerSizeState={toggleContainerSizeState}
          onCloseClick={onCloseClick}
        />
      </div>

      <div className="h-0 outline outline-1 outline-offset-[-0.50px] outline-gray-200" />

      <div
        style={{
          height,
          width:
            containerSize !== AI_CHAT_CONTAINER_SIZES.EXPANDED
              ? '450px'
              : `${parentWidth - 40}px`,
        }}
        className="transition-all overflow-hidden"
      >
        <div className="py-8 flex flex-col h-full">
          <ScrollArea className="transition-all h-full w-full">
            <div className="flex-1 px-6">
              <div className="justify-center dark:text-primary text-base font-bold leading-[25px]">
                <span>{t('Welcome to OpenOps AI Chat!')}</span>
              </div>
              {children}
            </div>
          </ScrollArea>
          <div className="w-full rounded-tl rounded-tr px-4 relative">
            <TextareaAutosize
              className="w-full h-full min-h-[69px] resize-none rounded-lg border-gray-200 border-[1px] dark:text-primary-700 text-base font-normal leading-normal p-4 pt-5 pr-14 outline-none dark:bg-accent"
              minRows={2}
              maxRows={4}
              placeholder="Ask a question about the command you need"
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
              className="absolute right-10 bottom-7"
              onClick={handleSubmit}
            >
              <SendIcon className="text-gray-400 hover:text-gray-600" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

StepSettingsAiChatContainer.displayName = 'StepSettingsAiChatContainer';
export { StepSettingsAiChatContainer };
