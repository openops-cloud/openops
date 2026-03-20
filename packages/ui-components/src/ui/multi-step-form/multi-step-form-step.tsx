import * as React from 'react';

import { cn } from '../../lib/cn';
import { useMultiStepForm } from './multi-step-form';

interface MultiStepFormStepProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onBeforeLeave?: () => boolean | Promise<boolean>;
}

const MultiStepFormStep = React.forwardRef<
  HTMLDivElement,
  MultiStepFormStepProps
>(({ className, value, onBeforeLeave, children, ...props }, ref) => {
  const {
    currentStep,
    setSteps,
    registerStepValidation,
    unregisterStepValidation,
  } = useMultiStepForm();

  React.useEffect(() => {
    setSteps((prev: string[]) => {
      if (!prev.includes(value)) {
        return [...prev, value];
      }
      return prev;
    });
  }, [value, setSteps]);

  React.useEffect(() => {
    if (onBeforeLeave) {
      registerStepValidation(value, onBeforeLeave);
    }
    return () => {
      unregisterStepValidation(value);
    };
  }, [value, onBeforeLeave, registerStepValidation, unregisterStepValidation]);

  const isActive = currentStep === value;

  if (!isActive) return null;

  return (
    <div ref={ref} className={cn('space-y-6', className)} {...props}>
      {children}
    </div>
  );
});
MultiStepFormStep.displayName = 'MultiStepFormStep';

export { MultiStepFormStep };
export type { MultiStepFormStepProps };
