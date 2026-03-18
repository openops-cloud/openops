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
        'rounded-2xl border',
        transparent ? 'bg-transparent' : 'bg-input',
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
