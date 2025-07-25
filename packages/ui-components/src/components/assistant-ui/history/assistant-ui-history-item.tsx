import { cn } from '@/lib/cn';
import { t } from 'i18next';
import { X } from 'lucide-react';
import { OverflowTooltip } from '../../overflow-tooltip';
import { TooltipWrapper } from '../../tooltip-wrapper';

type AssistantUiHistoryItem = {
  displayName: string;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
};

const AssistantUiHistoryItem = ({
  displayName,
  isActive,
  onClick,
  onDelete,
}: AssistantUiHistoryItem) => {
  return (
    <div
      aria-selected={isActive}
      role="option"
      className={cn(
        'flex justify-between items-center gap-2 py-[9px] pl-[9px] pr-2 rounded-sm overflow-hidden cursor-pointer hover:bg-input hover:dark:bg-muted-foreground/80 group',
        {
          'bg-input': isActive,
        },
      )}
      onClick={onClick}
    >
      <OverflowTooltip
        text={displayName}
        className="flex-1 font-normal  dark:text-primary text-sm leading-snug truncate select-none"
      />
      <div
        className={cn(
          'gap-2 items-center justify-center hidden group-hover:flex',
        )}
      >
        <TooltipWrapper tooltipText={t('Delete')}>
          <X
            role="button"
            data-testid="edit-flow"
            size={13}
            className="text-primary"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          />
        </TooltipWrapper>
      </div>
    </div>
  );
};

AssistantUiHistoryItem.displayName = 'AssistantUiHistoryItem';
export { AssistantUiHistoryItem };
