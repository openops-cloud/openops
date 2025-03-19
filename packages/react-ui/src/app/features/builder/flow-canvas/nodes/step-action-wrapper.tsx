import { memo } from 'react';

const StepActionWrapper = memo(
  ({ children }: { children: React.ReactNode }) => {
    return (
      <div className="flex items-center gap-2 cursor-pointer">{children}</div>
    );
  },
);

StepActionWrapper.displayName = 'StepActionWrapper';
export { StepActionWrapper };
