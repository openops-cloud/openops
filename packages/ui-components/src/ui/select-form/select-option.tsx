import * as React from 'react';

import { cn } from '../../lib/cn';
import { Checkbox } from '../checkbox';
import { RadioGroupItem } from '../radio-group';
import { useSelectForm } from './select-form';

interface SelectOptionProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

const SelectOption = React.forwardRef<HTMLDivElement, SelectOptionProps>(
  ({ className, value, icon, disabled, children, onClick, ...props }, ref) => {
    const {
      type,
      value: formValue,
      onValueChange,
      disabled: formDisabled,
    } = useSelectForm();

    const isDisabled = disabled || formDisabled;
    const isSelected =
      type === 'single'
        ? formValue === value
        : Array.isArray(formValue) && formValue.includes(value);

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDisabled) return;

        onClick?.(e);

        if (type === 'single') {
          onValueChange(value);
        } else {
          const currentValues = Array.isArray(formValue) ? formValue : [];
          if (currentValues.includes(value)) {
            onValueChange(currentValues.filter((v) => v !== value));
          } else {
            onValueChange([...currentValues, value]);
          }
        }
      },
      [type, value, formValue, onValueChange, isDisabled, onClick],
    );

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      },
      [handleClick],
    );

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-4 px-4 py-3 cursor-pointer border-b border-border last:border-b-0 transition-colors',
          'hover:bg-accent focus:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isSelected && 'bg-accent/50',
          isDisabled && 'cursor-not-allowed opacity-50',
          className,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={isDisabled ? -1 : 0}
        role={type === 'single' ? 'radio' : 'checkbox'}
        aria-checked={isSelected}
        aria-disabled={isDisabled}
        {...props}
      >
        <div className="flex-shrink-0">
          {type === 'single' ? (
            <RadioGroupItem value={value} disabled={isDisabled} />
          ) : (
            <Checkbox
              checked={isSelected}
              disabled={isDisabled}
              aria-hidden="true"
            />
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">{children}</div>
        </div>
      </div>
    );
  },
);
SelectOption.displayName = 'SelectOption';

export { SelectOption };
