'use client';

import { Button, cn, Tooltip, TooltipContent } from '@openops/components/ui';
import { TooltipTrigger } from '@radix-ui/react-tooltip';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

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
  const Icon = isCollapsed ? ChevronsDownUp : ChevronsUpDown;

  const colorClasses = cn(
    'text-white bg-muted-foreground',
    'hover:bg-primary-200 group-hover:bg-primary-200 !text-white',
    isSelected && 'bg-primary-200 text-primary-foreground',
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
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
            'disabled:opacity-50 disabled:cursor-not-allowed',
            colorClasses,
            className,
          )}
        >
          <Icon size={16} strokeWidth={2.5} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        {isCollapsed ? 'Expand' : 'Collapse'}
      </TooltipContent>
    </Tooltip>
  );
}
