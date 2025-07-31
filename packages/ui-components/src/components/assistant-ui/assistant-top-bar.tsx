import { t } from 'i18next';
import {
  PanelLeft,
  PanelRightClose,
  SquarePen,
  X as XIcon,
} from 'lucide-react';
import { ReactNode } from 'react';
import { TooltipWrapper } from '../../components/tooltip-wrapper';
import { Button } from '../../ui/button';

type AssistantTopBarProps = {
  onClose: () => void;
  onNewChat: () => void;
  enableNewChat: boolean;
  title?: string;
  onToggleHistory?: () => void;
  isHistoryOpened?: boolean;
  children: ReactNode;
};

const AssistantTopBar = ({
  onNewChat,
  onClose,
  enableNewChat,
  title,
  onToggleHistory,
  isHistoryOpened,
  children,
}: AssistantTopBarProps) => {
  return (
    <div className="flex justify-between items-center px-4 py-2 gap-2 text-md dark:text-primary font-bold border-b border-gray-200">
      <div className="flex items-center gap-2">
        {onToggleHistory && (
          <TooltipWrapper tooltipText={t('Toggle history')}>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onToggleHistory();
              }}
              variant="secondary"
              size="icon"
              className="text-outline size-[36px]"
            >
              {isHistoryOpened ? (
                <PanelLeft size={20} />
              ) : (
                <PanelRightClose size={20} />
              )}
            </Button>
          </TooltipWrapper>
        )}

        <TooltipWrapper tooltipText={t('New chat')}>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onNewChat();
            }}
            disabled={!enableNewChat}
            variant="secondary"
            size="icon"
            className="text-outline size-[36px]"
          >
            <SquarePen size={20} />
          </Button>
        </TooltipWrapper>
        {title}
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
            <XIcon size={20} />
          </Button>
        </TooltipWrapper>
      </div>
    </div>
  );
};

AssistantTopBar.displayName = 'AssistantTopBar';
export { AssistantTopBar, AssistantTopBarProps };
