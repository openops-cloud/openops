import * as React from 'react';

import { cn } from '../../lib/cn';

type WizardContentProps = React.HTMLAttributes<HTMLDivElement>;

const WizardContent = React.forwardRef<HTMLDivElement, WizardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex-1 p-6 space-y-6 overflow-auto', className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
WizardContent.displayName = 'WizardContent';

export { WizardContent };
