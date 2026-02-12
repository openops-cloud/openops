import * as React from 'react';

import { cn } from '../../lib/cn';

interface StepNavigatorProps extends React.HTMLAttributes<HTMLDivElement> {
  current: number;
  total: number;
  showStepLabels?: boolean;
}

const StepNavigator = React.forwardRef<HTMLDivElement, StepNavigatorProps>(
  ({ className, current, total, showStepLabels = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center bg-background',
          className,
        )}
        {...props}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {showStepLabels && (
            <span className="text-muted-foreground">Step</span>
          )}
          <span className="text-blue-accent-500 font-semibold">{current}</span>
          <span className="text-muted-foreground">of</span>
          <span>{total}</span>
        </div>
      </div>
    );
  },
);
StepNavigator.displayName = 'StepNavigator';

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
          'flex items-center justify-center text-sm bg-neutral text-foreground',
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
