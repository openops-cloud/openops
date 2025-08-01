import { cn } from '../../lib/cn';
import { TooltipProvider } from '../../ui/tooltip';
import { OverflowTooltip } from '../overflow-tooltip';

type FlowTemplateFilterItemProps = {
  value: string;
  displayName: string;
  onClick: (id: string) => void;
  isActive: boolean;
};

export const FlowTemplateFilterItem = ({
  value,
  displayName,
  isActive,
  onClick,
}: FlowTemplateFilterItemProps) => (
  <div
    aria-selected={isActive}
    role="option"
    className={cn(
      'w-full px-3 py-3 justify-start items-start gap-2.5 inline-flex overflow-hidden cursor-pointer hover:bg-muted',
      {
        'bg-muted': isActive,
      },
    )}
    onClick={() => onClick(value)}
  >
    <TooltipProvider>
      <OverflowTooltip
        text={displayName}
        className="w-full font-normal text-slate-600 dark:text-primary text-base leading-snug truncate select-none"
      />
    </TooltipProvider>
  </div>
);
