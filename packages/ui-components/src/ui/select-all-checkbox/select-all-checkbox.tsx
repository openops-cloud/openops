import * as React from 'react';

import { cn } from '../../lib/cn';
import { Checkbox } from '../checkbox';
import { Label } from '../label';

export interface SelectAllCheckboxProps
  extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  checked: boolean | 'indeterminate';
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  checkboxClassName?: string;
  labelClassName?: string;
}

const SelectAllCheckbox = React.forwardRef<
  HTMLDivElement,
  SelectAllCheckboxProps
>(
  (
    {
      className,
      id,
      checked,
      onCheckedChange,
      label,
      disabled,
      checkboxClassName,
      labelClassName,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center space-x-4', className)}
        {...props}
      >
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className={cn(
            'flex items-center justify-center rounded-xs data-[state=checked]:!bg-primary-200 data-[state=indeterminate]:!bg-primary-200 data-[state=checked]:!border-primary-200 data-[state=indeterminate]:!border-primary-200',
            checkboxClassName,
          )}
        />
        <Label
          htmlFor={id}
          className={cn(
            'font-medium cursor-pointer select-none',
            disabled && 'cursor-not-allowed opacity-70',
            labelClassName,
          )}
        >
          {label}
        </Label>
      </div>
    );
  },
);

SelectAllCheckbox.displayName = 'SelectAllCheckbox';

export { SelectAllCheckbox };
