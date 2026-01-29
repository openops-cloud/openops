import { isNil } from '@openops/shared';
import { t } from 'i18next';
import {
  History,
  MessageSquarePlus,
  SquareArrowOutDownLeft,
} from 'lucide-react';
import { ReactNode } from 'react';
import { BlockIcon } from '../../components/block-icon/block-icon';
import { TooltipWrapper } from '../../components/tooltip-wrapper';
import { useTypingAnimation } from '../../hooks/use-typing-animation';
import { cn } from '../../lib/cn';
import { TOP_BAR_HEIGHT } from '../../lib/constants';
import { Button } from '../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';

type AssistantTopBarProps = {
  onClose: () => void;
  onNewChat: () => void;
  title: string;
  isTitleDefault?: boolean;
  onHistoryOpenChange?: (open: boolean) => void;
  isHistoryOpen?: boolean;
  historyContent?: ReactNode;
  children: ReactNode;
  chatId?: string | null;
  stepLogoUrl?: string;
  stepDisplayName?: string;
  stepIndex?: number;
  blockDisplayName?: string;
};

const AssistantTopBar = ({
  onNewChat,
  onClose,
  title,
  onHistoryOpenChange,
  isHistoryOpen,
  historyContent,
  children,
  chatId,
  isTitleDefault,
  stepLogoUrl,
  stepDisplayName,
  stepIndex,
  blockDisplayName,
}: AssistantTopBarProps) => {
  const animatedTitle = useTypingAnimation({
    text: title,
    speed: 50,
    chatId: chatId,
    enableAnimation: !isTitleDefault,
  });

  const isStepSettingsMode =
    !isNil(stepLogoUrl) &&
    !isNil(blockDisplayName) &&
    !isNil(stepIndex) &&
    !isNil(stepDisplayName);

  const displayTitle = isStepSettingsMode
    ? t('Generate with AI')
    : animatedTitle;

  return (
    <div
      className={cn(
        'flex flex-col px-4 py-2 gap-1 flex-shrink-0 text-sm dark:text-primary font-bold border-b border-gray-200 justify-center',
      )}
      style={{ minHeight: `${TOP_BAR_HEIGHT}px` }}
    >
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {onHistoryOpenChange && (
            <Popover open={isHistoryOpen} onOpenChange={onHistoryOpenChange}>
              <TooltipWrapper
                tooltipText={
                  isHistoryOpen ? t('Close history') : t('Open history')
                }
                tooltipPlacement={isHistoryOpen ? 'right' : 'bottom'}
                align="start"
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className={cn(
                      'text-outline size-[23px] rounded-xs bg-gray-100 enabled:hover:bg-gray-200',
                      isHistoryOpen && 'bg-gray-200',
                    )}
                  >
                    <History size={13} />
                  </Button>
                </PopoverTrigger>
              </TooltipWrapper>
              <PopoverContent
                className="w-[272px] h-[265px] p-0"
                align="start"
                side="bottom"
                sideOffset={8}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                {historyContent}
              </PopoverContent>
            </Popover>
          )}
          <TooltipWrapper
            tooltipText={t('New chat')}
            tooltipPlacement={isHistoryOpen ? 'right' : 'bottom'}
            align="start"
          >
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onNewChat();
              }}
              variant="secondary"
              size="icon"
              className="text-outline size-[23px] rounded-xs bg-gray-100 enabled:hover:bg-gray-200"
            >
              <MessageSquarePlus size={13} />
            </Button>
          </TooltipWrapper>
          <span className="min-w-0 max-w-[240px] text-sm truncate">
            {displayTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {children}
          <TooltipWrapper tooltipText={t('Close')}>
            <Button
              size="icon"
              variant="basic"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-outline size-[36px]"
            >
              <SquareArrowOutDownLeft size={16} />
            </Button>
          </TooltipWrapper>
        </div>
      </div>
      {isStepSettingsMode && (
        <div className="flex items-center gap-2 min-w-0 pl-1">
          <BlockIcon
            logoUrl={stepLogoUrl}
            displayName={blockDisplayName}
            showTooltip={false}
            className="size-[16px]"
          />
          <span className="min-w-0 truncate text-xs text-gray-500 font-medium">
            {blockDisplayName}
            <span className="italic ml-1">
              ( {stepIndex}. {stepDisplayName} )
            </span>
          </span>
        </div>
      )}
    </div>
  );
};

AssistantTopBar.displayName = 'AssistantTopBar';
export { AssistantTopBar, AssistantTopBarProps };
