'use client';

import { cn, Tooltip, TooltipContent } from '@openops/components/ui';
import { TooltipTrigger } from '@radix-ui/react-tooltip';
import { ChevronDown, ChevronUp } from 'lucide-react';

type CollapsibleButtonProps = {
  isCollapsed: boolean;
  isSelected?: boolean;
  onToggle: () => void;
  className?: string;
  disabled?: boolean;
};

export function CollapsibleButton({
  isCollapsed,
  isSelected = false,
  onToggle,
  className = '',
  disabled = false,
}: CollapsibleButtonProps) {
  const stopEventPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (e.nativeEvent?.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  const isExpanded = !isCollapsed;
  const label = isCollapsed ? 'Expand node' : 'Collapse node';

  const colorClasses = cn(
    'text-white bg-[#6B7280]',
    'hover:bg-primary-200 group-hover:bg-primary-200',
    (isSelected || isExpanded) && 'bg-primary-200 text-primary-foreground',
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onMouseDown={stopEventPropagation}
          onClick={(e) => {
            stopEventPropagation(e);
            if (!disabled) onToggle();
          }}
          disabled={disabled}
          aria-label={label}
          aria-expanded={isExpanded}
          title={label}
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-black/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            colorClasses,
            className,
          )}
        >
          <span className="flex flex-col items-center justify-center leading-none">
            <ChevronUp
              size={12}
              strokeWidth={2.5}
              className={cn(
                '-mb-0.5 transition-transform',
                isExpanded && 'rotate-180',
              )}
            />
            <ChevronDown
              size={12}
              strokeWidth={2.5}
              className={cn('transition-transform', isExpanded && 'rotate-180')}
            />
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        {isCollapsed ? 'Expand' : 'Collapse'}
      </TooltipContent>
    </Tooltip>
  );
}
