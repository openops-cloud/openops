import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Button } from '../button';

type WizardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

const WizardHeader = React.forwardRef<HTMLDivElement, WizardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between px-6 py-4 border-b border-border bg-background',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
WizardHeader.displayName = 'WizardHeader';

type WizardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

const WizardTitle = React.forwardRef<HTMLHeadingElement, WizardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <b
        ref={ref}
        className={cn(
          'text-md font-semibold leading-none tracking-tight text-foreground',
          className,
        )}
        {...props}
      >
        {children}
      </b>
    );
  },
);
WizardTitle.displayName = 'WizardTitle';

interface WizardCloseProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClose?: () => void;
}

const WizardClose = React.forwardRef<HTMLButtonElement, WizardCloseProps>(
  ({ className, onClose, onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onClose?.();
    };

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn(
          'h-6 w-6 rounded-sm opacity-70 text-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          className,
        )}
        onClick={handleClick}
        {...props}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>
    );
  },
);
WizardClose.displayName = 'WizardClose';

export { WizardClose, WizardHeader, WizardTitle };
