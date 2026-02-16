import * as React from 'react';

import { cn } from '../../lib/cn';

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

export { StepCounter };
