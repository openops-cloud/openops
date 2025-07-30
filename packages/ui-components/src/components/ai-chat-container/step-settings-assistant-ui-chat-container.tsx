import { Theme } from '@/lib/theme';
import { AssistantRuntime } from '@assistant-ui/react';
import { t } from 'i18next';
import { ExpandIcon, MinimizeIcon } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { AssistantUiChatContainer } from '../assistant-ui/assistant-ui-chat-container';
import { TooltipWrapper } from '../tooltip-wrapper';
import { AI_CHAT_CONTAINER_SIZES, AiCliChatContainerSizeState } from './types';

const COLLAPSED_HEIGHT = 57;
const DOCKED_HEIGHT = 450;
const EXPANDED_HEIGHT = 180;
const FULL_WIDTH_HEIGHT = 100;
const EXPANDED_WIDTH_OFFSET = 40;
const REGULAR_WIDTH = 450;

type StepSettingsAssistantUiChatContainerProps = {
  parentHeight: number;
  parentWidth: number;
  showAiChat: boolean;
  onCloseClick: () => void;
  onNewChatClick: () => void;
  containerSize: AiCliChatContainerSizeState;
  enableNewChat: boolean;
  toggleContainerSizeState: (state: AiCliChatContainerSizeState) => void;
  className?: string;
  isModelSelectorLoading: boolean;
  selectedModel?: string;
  availableModels: string[];
  onModelSelected: (modelName: string) => void;
  runtime: AssistantRuntime;
  theme: Theme;
  handleInject: (code: string) => void;
  showFullWidth: boolean;
};

const StepSettingsAssistantUiChatContainer = ({
  parentHeight,
  parentWidth,
  showAiChat,
  onCloseClick,
  onNewChatClick,
  containerSize,
  enableNewChat,
  toggleContainerSizeState,
  className,
  isModelSelectorLoading,
  selectedModel,
  availableModels,
  onModelSelected,
  runtime,
  theme,
  handleInject,
  showFullWidth,
}: StepSettingsAssistantUiChatContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  let height: number;
  if (containerSize === AI_CHAT_CONTAINER_SIZES.COLLAPSED) {
    height = COLLAPSED_HEIGHT;
  } else if (containerSize === AI_CHAT_CONTAINER_SIZES.DOCKED) {
    height = DOCKED_HEIGHT;
  } else if (containerSize === AI_CHAT_CONTAINER_SIZES.EXPANDED) {
    height = parentHeight - EXPANDED_HEIGHT;
  } else {
    height = parentHeight - FULL_WIDTH_HEIGHT;
  }

  let width: number;
  if (containerSize === AI_CHAT_CONTAINER_SIZES.EXPANDED || showFullWidth) {
    width = parentWidth - EXPANDED_WIDTH_OFFSET;
  } else {
    width = REGULAR_WIDTH;
  }

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
      <AssistantUiChatContainer
        handleInject={handleInject}
        selectedModel={selectedModel}
        onModelSelected={onModelSelected}
        isModelSelectorLoading={isModelSelectorLoading}
        runtime={runtime}
        onClose={onCloseClick}
        onNewChat={onNewChatClick}
        enableNewChat={enableNewChat}
        availableModels={availableModels}
        theme={theme}
        title={t('AI Chat')}
      >
        <div
          className="text-md dark:text-primary items-center font-bold flex"
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
          <TooltipWrapper
            tooltipText={
              containerSize === AI_CHAT_CONTAINER_SIZES.EXPANDED
                ? t('Dock')
                : t('Expand')
            }
          >
            <Button
              size="icon"
              className="text-outline"
              onClick={(e) => {
                e.stopPropagation();

                if (containerSize === AI_CHAT_CONTAINER_SIZES.EXPANDED) {
                  toggleContainerSizeState(AI_CHAT_CONTAINER_SIZES.DOCKED);
                } else {
                  toggleContainerSizeState(AI_CHAT_CONTAINER_SIZES.EXPANDED);
                }
              }}
              variant="basic"
            >
              {containerSize === AI_CHAT_CONTAINER_SIZES.EXPANDED ? (
                <MinimizeIcon size={16} />
              ) : (
                <ExpandIcon size={16} />
              )}
            </Button>
          </TooltipWrapper>
        </div>
      </AssistantUiChatContainer>
    </div>
  );
};

StepSettingsAssistantUiChatContainer.displayName =
  'StepSettingsAssistantUiChatContainer';
export { StepSettingsAssistantUiChatContainer };
