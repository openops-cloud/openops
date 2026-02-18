import { cva, type VariantProps } from 'class-variance-authority';
import { t } from 'i18next';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Checkbox } from '../checkbox';
import { Label } from '../label';

export type SelectAllChangeAction = 'selectAll' | 'clear';

const checkboxVariants = cva('flex items-center justify-center rounded-xs', {
  variants: {
    variant: {
      default: 'dark:data-[state=indeterminate]:!text-background',
      primary:
        'data-[state=checked]:!bg-primary-200 data-[state=indeterminate]:!bg-primary-200 data-[state=checked]:!border-primary-200 data-[state=indeterminate]:!border-primary-200',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});

export interface SelectAllCheckboxProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof checkboxVariants> {
  id?: string;
  selectedCount: number;
  totalCount: number;
  onSelectAllChange: (action: SelectAllChangeAction) => void;
  disabled?: boolean;
  labelClassName?: string;
}

const SelectAllCheckbox = React.forwardRef<
  HTMLDivElement,
  SelectAllCheckboxProps
>(
  (
    {
      className,
      id: externalId,
      selectedCount,
      totalCount,
      onSelectAllChange,
      variant,
      disabled,
      labelClassName,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const id = externalId ?? generatedId;

    const checkedState = React.useMemo(() => {
      if (totalCount > 0 && selectedCount === totalCount) {
        return true;
      }
      if (selectedCount > 0) {
        return 'indeterminate' as const;
      }
      return false;
    }, [selectedCount, totalCount]);

    const handleCheckedChange = React.useCallback(() => {
      const action: SelectAllChangeAction =
        checkedState === false ? 'selectAll' : 'clear';
      onSelectAllChange(action);
    }, [checkedState, onSelectAllChange]);

    const displayLabel =
      checkedState === true || checkedState === 'indeterminate'
        ? t('Clear all')
        : t('Select all');

    return (
      <div
        ref={ref}
        className={cn('flex items-center space-x-4', className)}
        {...props}
      >
        <Checkbox
          id={id}
          checked={checkedState}
          onCheckedChange={handleCheckedChange}
          disabled={disabled}
          className={checkboxVariants({ variant })}
        />
        <Label
          htmlFor={id}
          className={cn(
            'font-medium cursor-pointer select-none dark:text-foreground',
            disabled && 'cursor-not-allowed opacity-70',
            labelClassName,
          )}
        >
          {displayLabel}
        </Label>
      </div>
    );
  },
);

SelectAllCheckbox.displayName = 'SelectAllCheckbox';

export { SelectAllCheckbox };
