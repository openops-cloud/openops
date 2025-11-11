import { t } from 'i18next';
import { History, SquareArrowOutDownLeft, SquarePen } from 'lucide-react';
import { ReactNode } from 'react';
import { TooltipWrapper } from '../../components/tooltip-wrapper';
import { useTypingAnimation } from '../../hooks/use-typing-animation';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';

type AssistantTopBarProps = {
  onClose: () => void;
  onNewChat: () => void;
  title?: string;
  onHistoryOpenChange?: (open: boolean) => void;
  isHistoryOpen?: boolean;
  historyContent?: ReactNode;
  children: ReactNode;
  chatId?: string | null;
};

const AI_ASSISTANT_DEFAULT_TITLE = 'AI Assistant';

const AssistantTopBar = ({
  onNewChat,
  onClose,
  title,
  onHistoryOpenChange,
  isHistoryOpen,
  historyContent,
  children,
  chatId,
}: AssistantTopBarProps) => {
  const animatedTitle = useTypingAnimation({
    text: title || AI_ASSISTANT_DEFAULT_TITLE,
    speed: 50,
    fromText: AI_ASSISTANT_DEFAULT_TITLE,
    defaultText: AI_ASSISTANT_DEFAULT_TITLE,
    chatId: chatId,
  });

  return (
    <div className="flex justify-between items-center px-4 py-2 gap-2 h-[61px] flex-shrink-0 text-md dark:text-primary font-bold border-b border-gray-200">
      <div className="flex items-center gap-2">
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
            <SquarePen size={13} />
          </Button>
        </TooltipWrapper>
        <span className="min-w-0 max-w-[240px] truncate">{animatedTitle}</span>
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
            <SquareArrowOutDownLeft size={20} />
          </Button>
        </TooltipWrapper>
      </div>
    </div>
  );
};

AssistantTopBar.displayName = 'AssistantTopBar';
export { AssistantTopBar, AssistantTopBarProps };
