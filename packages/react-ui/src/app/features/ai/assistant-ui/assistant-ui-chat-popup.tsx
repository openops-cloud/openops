import AssistantUiChat from '@/app/features/ai/assistant-ui/assistant-ui-chat';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { useAppStore } from '@/app/store/app-store';
import {
  AI_CHAT_CONTAINER_SIZES,
  AiAssistantChatSizeState,
  AssistantUiResizableContainer,
  Button,
  cn,
  TooltipWrapper,
} from '@openops/components/ui';
import { t } from 'i18next';
import { ExpandIcon, MinimizeIcon } from 'lucide-react';
import { useCallback, useMemo } from 'react';

type AssistantUiChatPopupProps = {
  middlePanelSize: {
    width: number;
    height: number;
  };
  className?: string;
};

const CHAT_MAX_WIDTH = 600;
const CHAT_EXPANDED_WIDTH_OFFSET = 32;
const CHAT_WIDTH_FACTOR = 0.3;
const PARENT_INITIAL_HEIGHT_GAP = 220;
const PARENT_MAX_HEIGHT_GAP = 95;
const CHAT_MIN_WIDTH = 375;

const AssistantUiChatPopup = ({
  middlePanelSize,
  className,
}: AssistantUiChatPopupProps) => {
  const {
    isAiChatOpened,
    setIsAiChatOpened,
    aiChatSize,
    setAiChatSize,
    aiChatDimensions,
    setAiChatDimensions,
  } = useAppStore((s) => ({
    isAiChatOpened: s.isAiChatOpened,
    setIsAiChatOpened: s.setIsAiChatOpened,
    aiChatSize: s.aiChatSize,
    setAiChatSize: s.setAiChatSize,
    aiChatDimensions: s.aiChatDimensions,
    setAiChatDimensions: s.setAiChatDimensions,
  }));

  const sizes = useMemo(() => {
    const calculatedWidth = middlePanelSize.width * CHAT_WIDTH_FACTOR;
    const calculatedExpandedWidth =
      middlePanelSize.width - CHAT_EXPANDED_WIDTH_OFFSET;

    const calculatedHeight =
      middlePanelSize.height -
      (aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED
        ? PARENT_MAX_HEIGHT_GAP
        : PARENT_INITIAL_HEIGHT_GAP);

    return {
      current: aiChatDimensions ?? {
        width: Math.max(
          CHAT_MIN_WIDTH,
          aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED
            ? calculatedExpandedWidth
            : Math.min(calculatedWidth, CHAT_MAX_WIDTH),
        ),
        height: calculatedHeight,
      },
      max: {
        width: middlePanelSize.width - CHAT_EXPANDED_WIDTH_OFFSET,
        height: middlePanelSize.height - PARENT_MAX_HEIGHT_GAP,
      },
    };
  }, [
    aiChatDimensions,
    aiChatSize,
    middlePanelSize.height,
    middlePanelSize.width,
  ]);

  const { hasActiveAiSettings, isLoading } =
    aiSettingsHooks.useHasActiveAiSettings();

  const onToggleAiChatState = useCallback(() => {
    let newSize: AiAssistantChatSizeState;
    if (aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED) {
      newSize = AI_CHAT_CONTAINER_SIZES.DOCKED;
    } else {
      newSize = AI_CHAT_CONTAINER_SIZES.EXPANDED;
    }
    setAiChatSize(newSize);
  }, [aiChatSize, setAiChatSize]);

  if (isLoading || (!hasActiveAiSettings && isAiChatOpened)) {
    return null;
  }

  return (
    <AssistantUiResizableContainer
      dimensions={sizes.current}
      setDimensions={setAiChatDimensions}
      maxSize={sizes.max}
      showAiChat={isAiChatOpened}
      className={cn('left-4 bottom-[17px]', className)}
      minWidth={CHAT_MIN_WIDTH}
      aiChatSize={aiChatSize}
    >
      <AssistantUiChat
        onClose={() => {
          setIsAiChatOpened(false);
        }}
        title={t('AI Assistant')}
      >
        <TooltipWrapper
          tooltipText={
            aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED
              ? t('Dock')
              : t('Expand')
          }
        >
          <Button
            size="icon"
            className="text-outline"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAiChatState();
            }}
            variant="basic"
          >
            {aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED ? (
              <MinimizeIcon size={16} />
            ) : (
              <ExpandIcon size={16} />
            )}
          </Button>
        </TooltipWrapper>
      </AssistantUiChat>
    </AssistantUiResizableContainer>
  );
};

AssistantUiChatPopup.displayName = 'AssistantUiChatPopup';
export { AssistantUiChatPopup };
