import * as React from 'react';

import { cn } from '../lib/cn';

type ComposingCardProps = React.HTMLAttributes<HTMLDivElement> & {
  transparent?: boolean;
};

const ComposingCard = React.forwardRef<HTMLDivElement, ComposingCardProps>(
  ({ className, transparent = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'w-full rounded-2xl border',
        {
          'bg-transparent': transparent,
          'bg-neutral-50 dark:bg-background': !transparent,
        },
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
ComposingCard.displayName = 'ComposingCard';

export { ComposingCard };
