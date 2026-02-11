import * as React from 'react';

import { cn } from '../../lib/cn';

interface StepNavigatorProps extends React.HTMLAttributes<HTMLDivElement> {
  current: number;
  total: number;
  variant?: 'default' | 'dots';
  showStepLabels?: boolean;
}

const StepNavigator = React.forwardRef<HTMLDivElement, StepNavigatorProps>(
  (
    {
      className,
      current,
      total,
      variant = 'default',
      showStepLabels = false,
      ...props
    },
    ref,
  ) => {
    if (variant === 'dots') {
      return (
        <div
          ref={ref}
          className={cn('flex items-center justify-center gap-2', className)}
          {...props}
        >
          {Array.from({ length: total }, (_, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === current;
            const isCompleted = stepNumber < current;

            return (
              <div
                key={stepNumber}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  isActive && 'bg-primary',
                  isCompleted && 'bg-primary/60',
                  !isActive && !isCompleted && 'bg-muted-foreground/30',
                )}
              />
            );
          })}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center', className)}
        {...props}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {showStepLabels && (
            <span className="text-muted-foreground">Step</span>
          )}
          <span className="text-primary font-semibold">{current}</span>
          <span className="text-muted-foreground">of</span>
          <span>{total}</span>
        </div>
      </div>
    );
  },
);
StepNavigator.displayName = 'StepNavigator';

// Alternative compact version matching the Figma design "2/5"
interface StepCounterProps extends React.HTMLAttributes<HTMLDivElement> {
  current: number;
  total: number;
}

const StepCounter = React.forwardRef<HTMLDivElement, StepCounterProps>(
  ({ className, current, total, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center text-sm font-medium text-black',
          className,
        )}
        {...props}
      >
        <span>
          {current}/{total}
        </span>
      </div>
    );
  },
);
StepCounter.displayName = 'StepCounter';

export { StepCounter, StepNavigator };
