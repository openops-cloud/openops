import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib/cn';

const listItemVariants = cva('flex items-center px-4 py-3 min-h-[49px]', {
  variants: {
    spacing: {
      compact: 'space-x-2',
      default: 'space-x-4',
      spacious: 'space-x-6',
    },
    hasSeparator: {
      true: 'border-b border-border',
      false: '',
    },
  },
  defaultVariants: {
    spacing: 'default',
    hasSeparator: false,
  },
});

export interface ListItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof listItemVariants> {
  children: React.ReactNode;
}

const ListItem = React.forwardRef<HTMLDivElement, ListItemProps>(
  ({ className, children, spacing, hasSeparator, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(listItemVariants({ spacing, hasSeparator }), className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

ListItem.displayName = 'ListItem';

export { ListItem, listItemVariants };
