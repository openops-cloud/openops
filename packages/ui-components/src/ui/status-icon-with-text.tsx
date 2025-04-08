import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

const statusCodeVariants = cva(
  'inline-flex gap-1 rounded px-2.5 py-1 text-xs font-semibold',
  {
    variants: {
      variant: {
        success: 'bg-success-100 text-success-300',
        error: 'bg-destructive-100 text-destructive-300',
        default: 'bg-accent text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface StatusIconWithTextProps
  extends VariantProps<typeof statusCodeVariants> {
  icon: any;
  text: string;
  explanation?: string;
}

const StatusIconWithText = React.memo(
  ({ icon: Icon, text, explanation, variant }: StatusIconWithTextProps) => {
    return (
      <span className={statusCodeVariants({ variant })}>
        <Icon className="size-4" />
        <span className="font-bold text-[13px]">{text}</span>
        {explanation && (
          <>
            <span className="font-light text-[15px]">|</span>
            <span className="text-xs font-medium italic"> {explanation}</span>
          </>
        )}
      </span>
    );
  },
);

StatusIconWithText.displayName = 'StatusIconWithText';
export { StatusIconWithText };
