import { ArrowLeft, ArrowRight } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Button, ButtonProps } from '../button';
import { useMultiStepForm } from './multi-step-form';

type MultiStepFormFooterProps = React.HTMLAttributes<HTMLDivElement>;

const MultiStepFormFooter = React.forwardRef<
  HTMLDivElement,
  MultiStepFormFooterProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between px-6 py-3 gap-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
MultiStepFormFooter.displayName = 'MultiStepFormFooter';

interface MultiStepFormPreviousProps extends ButtonProps {
  onPrevious?: () => void;
}

const MultiStepFormPrevious = React.forwardRef<
  HTMLButtonElement,
  MultiStepFormPreviousProps
>(({ className, children, onPrevious, onClick, disabled, ...props }, ref) => {
  const { isFirstStep, goToPrevious } = useMultiStepForm();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (onPrevious) {
      onPrevious();
    } else {
      goToPrevious();
    }
  };

  return (
    <Button
      ref={ref}
      variant="outline"
      className={cn('gap-2', className)}
      onClick={handleClick}
      disabled={disabled || isFirstStep}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      {children || 'Previous'}
    </Button>
  );
});
MultiStepFormPrevious.displayName = 'MultiStepFormPrevious';

interface MultiStepFormNextProps extends ButtonProps {
  onNext?: () => void | Promise<void>;
}

const MultiStepFormNext = React.forwardRef<
  HTMLButtonElement,
  MultiStepFormNextProps
>(({ className, children, onNext, onClick, disabled, ...props }, ref) => {
  const { goToNext } = useMultiStepForm();

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (onNext) {
      await onNext();
    } else {
      await goToNext();
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
});
MultiStepFormNext.displayName = 'MultiStepFormNext';

export { MultiStepFormFooter, MultiStepFormNext, MultiStepFormPrevious };
