import * as React from 'react';

import { cn } from '../../lib/cn';

type MultiStepFormContentProps = React.HTMLAttributes<HTMLDivElement>;

const MultiStepFormContent = React.forwardRef<
  HTMLDivElement,
  MultiStepFormContentProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex-1 px-6 py-2 space-y-6 overflow-auto', className)}
      {...props}
    >
      {children}
    </div>
  );
});
MultiStepFormContent.displayName = 'MultiStepFormContent';

export { MultiStepFormContent };
