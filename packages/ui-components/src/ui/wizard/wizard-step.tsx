import * as React from 'react';

import { cn } from '../../lib/cn';
import { useWizard } from './wizard';

interface WizardStepProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const WizardStep = React.forwardRef<HTMLDivElement, WizardStepProps>(
  ({ className, value, children, ...props }, ref) => {
    const { currentStep, setSteps } = useWizard();

    React.useEffect(() => {
      setSteps((prev: string[]) => {
        if (!prev.includes(value)) {
          return [...prev, value];
        }
        return prev;
      });
    }, [value, setSteps]);

    const isActive = currentStep === value;

    if (!isActive) return null;

    return (
      <div ref={ref} className={cn('space-y-6', className)} {...props}>
        {children}
      </div>
    );
  },
);
WizardStep.displayName = 'WizardStep';

type StepTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

const StepTitle = React.forwardRef<HTMLHeadingElement, StepTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-sm font-semibold leading-6 dark:bg-background text-foreground',
          className,
        )}
        {...props}
      >
        {children}
      </h3>
    );
  },
);
StepTitle.displayName = 'StepTitle';

type StepDescriptionProps = React.HTMLAttributes<HTMLDivElement>;

const StepDescription = React.forwardRef<HTMLDivElement, StepDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'text-sm leading-5 bg-neutral text-foreground',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
StepDescription.displayName = 'StepDescription';

type StepBodyProps = React.HTMLAttributes<HTMLDivElement>;

const StepBody = React.forwardRef<HTMLDivElement, StepBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('bg-neutral border border-border rounded-lg', className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
StepBody.displayName = 'StepBody';

export { StepBody, StepDescription, StepTitle, WizardStep };
