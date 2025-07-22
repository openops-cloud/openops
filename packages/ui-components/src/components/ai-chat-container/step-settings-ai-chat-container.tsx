import { t } from 'i18next';
import { Sparkles } from 'lucide-react';
import { ReactNode, useRef } from 'react';
import { cn } from '../../lib/cn';
import { AiChatSizeTogglers } from './ai-chat-size-togglers';
import { AI_CHAT_CONTAINER_SIZES, AiCliChatContainerSizeState } from './types';

type StepSettingsAiChatContainerProps = {
  parentHeight: number;
  parentWidth: number;
  showAiChat: boolean;
  onCloseClick: () => void;
  onNewChatClick: () => void;
  containerSize: AiCliChatContainerSizeState;
  enableNewChat: boolean;
  toggleContainerSizeState: (state: AiCliChatContainerSizeState) => void;
  className?: string;
  children?: ReactNode;
};

const StepSettingsAiChatContainer = ({
  parentHeight,
  parentWidth,
  showAiChat,
  onCloseClick,
  onNewChatClick,
  enableNewChat,
  containerSize,
  toggleContainerSizeState,
  className,
  children,
}: StepSettingsAiChatContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  let height: number;
  if (containerSize === AI_CHAT_CONTAINER_SIZES.COLLAPSED) {
    height = 0;
  } else if (containerSize === AI_CHAT_CONTAINER_SIZES.DOCKED) {
    height = 450;
  } else if (containerSize === AI_CHAT_CONTAINER_SIZES.EXPANDED) {
    height = parentHeight - 180;
  } else {
    height = parentHeight - 100;
  }

  const width =
    containerSize !== AI_CHAT_CONTAINER_SIZES.EXPANDED ? 450 : parentWidth - 40;

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute bottom-[0px] mr-5 mb-5 z-50 transition-all border border-solid border-outline overflow-x-hidden dark:text-primary bg-background shadow-lg rounded-md',
        {
          hidden: !showAiChat,
        },
        className,
      )}
      style={{
        height: `${height}px`,
        width: `${width}px`,
      }}
    >
      <div className="h-full flex flex-col">
        <div
          className="text-md dark:text-primary items-center font-bold px-5 py-2 flex gap-2 border-b border-gray-200"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (containerSize === AI_CHAT_CONTAINER_SIZES.COLLAPSED) {
              toggleContainerSizeState(AI_CHAT_CONTAINER_SIZES.DOCKED);
            } else {
              toggleContainerSizeState(AI_CHAT_CONTAINER_SIZES.COLLAPSED);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (containerSize === AI_CHAT_CONTAINER_SIZES.COLLAPSED) {
                toggleContainerSizeState(AI_CHAT_CONTAINER_SIZES.DOCKED);
              } else {
                toggleContainerSizeState(AI_CHAT_CONTAINER_SIZES.COLLAPSED);
              }
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

        <div className="overflow-hidden flex-1">
          <div className="flex flex-col h-full">{children}</div>
        </div>
      </div>
    </div>
  );
};

StepSettingsAiChatContainer.displayName = 'StepSettingsAiChatContainer';
export { StepSettingsAiChatContainer };
