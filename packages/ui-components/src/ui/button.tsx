import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../lib/cn';

import { isMacUserAgent } from '../lib/user-agent-utils';
import { LoadingSpinner } from './spinner';

const buttonVariants = cva(
  'ring-offset-background inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary-200 stroke-background text-primary-foreground enabled:hover:bg-primary/90 enabled:hover:dark:bg-foreground/20',
        basic: 'text-primary underline-offset-4 enabled:hover:bg-accent',
        destructive:
          'bg-destructive text-background enabled:hover:bg-destructive/90',
        outline:
          'border-input bg-background enabled:hover:bg-accent text-accent-foreground border',
        secondary:
          'bg-secondary text-secondary-foreground enabled:hover:bg-secondary/80',
        ghost:
          'enabled:hover:bg-accent enabled:hover:text-primary-300 focus-visible:ring-0 enabled:hover:dark:text-primary',
        ghostActive:
          'bg-accent !text-blueAccent-300 focus-visible:ring-0 enabled:hover:dark:text-primary',
        link: 'text-primary underline-offset-4 enabled:hover:underline',
        transparent: 'text-primary enabled:hover:bg-transparent',
        transparentOnDark: 'text-white',
        greenRounded:
          'bg-background bg-gradient-to-t from-greenAccent to-greenAccent-200 !py-[7px] !px-[13.5px] !rounded-lg text-primary font-bold text-[16px]  hover:underline disabled:from-greenAccent/60 disabled:to-greenAccent-200/40 disabled:opacity-100 disabled:text-primary/50',
        ai: 'focus-visible:ring-0 dark:text-white bg-background bg-gradient-to-r from-ring/35 to-primary-200/35 rounded-xl transition-all hover:from-ring/45 hover:to-primary-200/45',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-sm px-3',
        lg: 'h-11 rounded-sm px-8',
        xs: 'h-6 p-2',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  keyboardShortcut?: string;
  onKeyboardShortcut?: () => void;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      keyboardShortcut,
      disabled,
      onKeyboardShortcut,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    const isMac = isMacUserAgent();
    const isEscape = keyboardShortcut?.toLocaleLowerCase() === 'esc';
    React.useEffect(() => {
      if (keyboardShortcut) {
        document.addEventListener('keydown', handleKeyDown);
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [keyboardShortcut, disabled]);

    const handleKeyDown = (event: KeyboardEvent) => {
      const isEscapePressed = event.key === 'Escape' && isEscape;
      const isCtrlWithShortcut =
        keyboardShortcut &&
        event.key === keyboardShortcut.toLocaleLowerCase() &&
        (isMac ? event.metaKey : event.ctrlKey);
      if (isEscapePressed || isCtrlWithShortcut) {
        event.preventDefault();
        event.stopPropagation();
        if (onKeyboardShortcut && !disabled) {
          onKeyboardShortcut();
        }
      }
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), {})}
        ref={ref}
        disabled={disabled || loading}
        {...props}
        onClick={(e) => {
          loading ? e.stopPropagation() : props.onClick && props.onClick(e);
        }}
      >
        {loading ? (
          <LoadingSpinner
            className={
              variant === 'default' ? 'stroke-background' : 'stroke-foreground'
            }
          />
        ) : (
          <>
            {keyboardShortcut && (
              <div className="flex justify-center items-center gap-2">
                {children}
                <span className="flex-grow text-xs tracking-widest text-muted-foreground">
                  {!isEscape && (isMac ? '⌘' : 'Ctrl')}
                  {!isEscape && ' + '}
                  {keyboardShortcut.toString().toLocaleUpperCase()}
                </span>
              </div>
            )}
            {!keyboardShortcut && children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
