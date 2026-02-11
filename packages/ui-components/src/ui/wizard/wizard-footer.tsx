import { ArrowLeft, ArrowRight } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Button } from '../button';
import { useWizard } from './wizard';

type WizardFooterProps = React.HTMLAttributes<HTMLDivElement>;

const WizardFooter = React.forwardRef<HTMLDivElement, WizardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between p-6 border-t border-border gap-4',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
WizardFooter.displayName = 'WizardFooter';

interface WizardPreviousProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onPrevious?: () => void;
}

const WizardPrevious = React.forwardRef<HTMLButtonElement, WizardPreviousProps>(
  ({ className, children, onPrevious, onClick, disabled, ...props }, ref) => {
    const { currentStep, steps, setCurrentStep } = useWizard();

    const currentIndex = steps.indexOf(currentStep);
    const hasPrevious = currentIndex > 0;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (onPrevious) {
        onPrevious();
      } else if (hasPrevious) {
        setCurrentStep(steps[currentIndex - 1]);
      }
    };

    return (
      <Button
        ref={ref}
        variant="outline"
        className={cn('gap-2', className)}
        onClick={handleClick}
        disabled={disabled || !hasPrevious}
        {...props}
      >
        <ArrowLeft className="h-4 w-4" />
        {children || 'Previous'}
      </Button>
    );
  },
);
WizardPrevious.displayName = 'WizardPrevious';

interface WizardNextProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onNext?: () => void;
}

const WizardNext = React.forwardRef<HTMLButtonElement, WizardNextProps>(
  ({ className, children, onNext, onClick, disabled, ...props }, ref) => {
    const { currentStep, steps, setCurrentStep } = useWizard();

    const currentIndex = steps.indexOf(currentStep);
    const hasNext = currentIndex < steps.length - 1;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (onNext) {
        onNext();
      } else if (hasNext) {
        setCurrentStep(steps[currentIndex + 1]);
      }
    };

    return (
      <Button
        ref={ref}
        className={cn('gap-2', className)}
        onClick={handleClick}
        disabled={disabled}
        {...props}
      >
        {children || 'Next'}
        <ArrowRight className="h-4 w-4" />
      </Button>
    );
  },
);
WizardNext.displayName = 'WizardNext';

export { WizardFooter, WizardNext, WizardPrevious };
