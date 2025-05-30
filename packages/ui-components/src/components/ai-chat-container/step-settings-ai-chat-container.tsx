import { UseChatHelpers } from '@ai-sdk/react';
import { t } from 'i18next';
import { Sparkles } from 'lucide-react';
import { ReactNode, useEffect, useRef } from 'react';
import { cn } from '../../lib/cn';
import { AI_CHAT_SCROLL_DELAY } from '../../lib/constants';
import { ScrollArea } from '../../ui/scroll-area';
import { AiChatInput } from './ai-chat-input';
import { AiChatSizeTogglers } from './ai-chat-size-togglers';
import { AiModelSelectorProps } from './ai-model-selector';
import { AI_CHAT_CONTAINER_SIZES, AiCliChatContainerSizeState } from './types';

type StepSettingsAiChatContainerProps = {
  parentHeight: number;
  parentWidth: number;
  showAiChat: boolean;
  onCloseClick: () => void;
  onNewChatClick: () => void;
  onToggle: () => void;
  containerSize: AiCliChatContainerSizeState;
  enableNewChat: boolean;
  isEmpty: boolean;
  stepName: string;
  toggleContainerSizeState: (state: AiCliChatContainerSizeState) => void;
  className?: string;
  children?: ReactNode;
} & Pick<UseChatHelpers, 'input' | 'handleInputChange' | 'handleSubmit'> &
  AiModelSelectorProps;

const StepSettingsAiChatContainer = ({
  parentHeight,
  parentWidth,
  showAiChat,
  onCloseClick,
  onNewChatClick,
  enableNewChat,
  onToggle,
  containerSize,
  toggleContainerSizeState,
  className,
  children,
  handleInputChange,
  handleSubmit,
  input,
  stepName,
  isEmpty = true,
  availableModels,
  selectedModel,
  onModelSelected,
  isModelSelectorLoading,
}: StepSettingsAiChatContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const hasScrolledOnce = useRef<boolean>(false);

  useEffect(() => {
    hasScrolledOnce.current = false;
  }, [stepName]);

  useEffect(() => {
    setTimeout(() => {
      if (
        scrollViewportRef.current &&
        !isEmpty &&
        showAiChat &&
        !hasScrolledOnce.current
      ) {
        scrollViewportRef.current.scrollTo({
          top: scrollViewportRef.current.scrollHeight,
          behavior: 'smooth',
        });

        hasScrolledOnce.current = true;
      }
    }, AI_CHAT_SCROLL_DELAY);
  }, [isEmpty, showAiChat, stepName]);

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
          onNewChatClick={onNewChatClick}
          enableNewChat={enableNewChat}
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
        <div className="py-4 flex flex-col h-full">
          <ScrollArea
            className="transition-all h-full w-full"
            viewPortRef={scrollViewportRef}
          >
            <div
              className={cn('flex-1 px-6', {
                'flex flex-col h-full': isEmpty,
              })}
            >
              {isEmpty ? (
                <div
                  className={
                    'flex-1 flex flex-col items-center justify-center gap-4'
                  }
                >
                  <span className="inline-block max-w-[220px] text-center dark:text-primary text-base font-bold leading-[25px]">
                    {t('Welcome to')}
                    <br />
                    {t('OpenOps AI Chat!')}
                  </span>
                  {children}
                </div>
              ) : (
                children
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
            placeholder={t('Ask a question about the command you need')}
          />
        </div>
      </div>
    </div>
  );
};

StepSettingsAiChatContainer.displayName = 'StepSettingsAiChatContainer';
export { StepSettingsAiChatContainer };
