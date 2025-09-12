'use client';

import {
  Button,
  cn,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openops/components/ui';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

type CollapsibleButtonProps = {
  readonly isCollapsed: boolean;
  readonly isSelected?: boolean;
  readonly onToggle: () => void;
  readonly className?: string;
  readonly disabled?: boolean;
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
  const Icon = isCollapsed ? ChevronsUpDown : ChevronsDownUp;

  const buttonClasses = cn(
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
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            buttonClasses,
            className,
          )}
        >
          <span
            className={cn(
              'transition-transform duration-200 ease-in-out',
              isCollapsed ? 'rotate-0' : 'rotate-180',
            )}
          >
            <Icon size={16} strokeWidth={2.5} />
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        {isCollapsed ? 'Expand' : 'Collapse'}
      </TooltipContent>
    </Tooltip>
  );
}
