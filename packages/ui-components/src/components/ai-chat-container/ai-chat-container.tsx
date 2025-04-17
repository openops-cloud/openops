import { t } from 'i18next';
import { Send as SendIcon, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { AiChatSizeTogglers } from './ai-chat-size-togglers';
import { AiChatContainerSizeState } from './types';

type AiChatContainerProps = {
  parentHeight: number;
  parentWidth: number;
  showAiChat: boolean;
  setShowAiChat: (showAiChat: boolean) => void;
  containerSize: AiChatContainerSizeState;
  toggleContainerSizeState: () => void;
  onSubmitChat: (message: string) => void;
  className?: string;
};

const AiChatContainer = ({
  parentHeight,
  parentWidth,
  showAiChat,
  setShowAiChat,
  containerSize,
  toggleContainerSizeState,
  onSubmitChat,
  className,
}: AiChatContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [promptValue, setPromptValue] = useState('');

  let height: string;
  if (containerSize === 'collapsed') {
    height = '0px';
  } else if (containerSize === 'docked') {
    height = '450px';
  } else {
    height = `${parentHeight - 100}px`;
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn(
        'absolute bottom-[0px] mr-5 mb-5 z-50 transition-all border border-solid border-outline overflow-x-hidden text-primary bg-background shadow-lg rounded-md',
        {
          'opacity-0 pointer-events-none': !showAiChat,
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
          onSubmitChat(promptValue);
        }
      }}
    >
      <div className="text-md text-primary items-center font-bold pl-8 pr-2 py-2 flex gap-2">
        <Sparkles />
        {t('AI Chat')} <div className="flex-grow"></div>
        <AiChatSizeTogglers
          state={containerSize}
          toggleContainerSizeState={toggleContainerSizeState}
          onCloseClick={() => setShowAiChat(false)}
        ></AiChatSizeTogglers>
      </div>
      <div className="h-0 outline outline-1 outline-offset-[-0.50px] outline-gray-200" />

      <div
        style={{
          height,
          width: `${parentWidth}px`,
        }}
        className="transition-all overflow-hidden"
      >
        <ScrollArea className="transition-all h-full w-full">
          <div className="py-8 flex flex-col h-full">
            <div className="justify-center text-primary text-base font-bold leading-[25px] flex-1 px-6">
              <span>Welcome to OpenOps AI Chat!</span>
            </div>

            <div className="w-full rounded-tl rounded-tr px-4 relative">
              <TextareaAutosize
                className="w-full h-full min-h-[69px] resize-none rounded-lg border-gray-200 border-[1px] text-primary-700 text-base font-normal leading-normal p-4 pt-5 pr-14 outline-none dark:bg-accent"
                minRows={2}
                maxRows={4}
                placeholder="Ask a question about the command you need"
                value={promptValue}
                onChange={(ev) => setPromptValue(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' && !ev.shiftKey) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    onSubmitChat(promptValue);
                  }
                }}
              />

              <Button
                size="icon"
                variant="transparent"
                className="absolute right-10 bottom-7"
                onClick={() => onSubmitChat(promptValue)}
              >
                <SendIcon className="text-gray-400 hover:text-gray-600" />
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

AiChatContainer.displayName = 'AiChatContainer';
export { AiChatContainer };
