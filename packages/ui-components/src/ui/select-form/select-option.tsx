import * as React from 'react';

import { cn } from '../../lib/cn';
import { Checkbox } from '../checkbox';
import { Label } from '../label';
import { RadioGroupItem } from '../radio-group';
import { useSelectForm } from './select-form';

interface SelectOptionProps extends React.HTMLAttributes<HTMLLabelElement> {
  value: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  disabled?: boolean;
}

const SelectOption = React.forwardRef<HTMLLabelElement, SelectOptionProps>(
  (
    { className, value, icon, iconClassName, disabled, children, ...props },
    ref,
  ) => {
    const {
      type,
      value: formValue,
      onValueChange,
      disabled: formDisabled,
      groupName,
    } = useSelectForm();

    const isDisabled = disabled || formDisabled;

    const isSelected = React.useMemo(() => {
      if (type === 'single') {
        return formValue === value;
      } else {
        const currentValues = Array.isArray(formValue) ? formValue : [];
        return currentValues.includes(value);
      }
    }, [type, formValue, value]);

    const inputId = React.useId();

    const handleInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isDisabled) return;

        if (type === 'single') {
          onValueChange(value);
        } else {
          const currentValues = Array.isArray(formValue) ? formValue : [];
          const newValues = e.target.checked
            ? [...currentValues, value]
            : currentValues.filter((v) => v !== value);
          onValueChange(newValues);
        }
      },
      [type, value, formValue, onValueChange, isDisabled],
    );

    const inputProps = React.useMemo(
      () => ({
        id: inputId,
        value,
        checked: isSelected,
        onChange: handleInputChange,
        disabled: isDisabled,
        className: 'sr-only',
        'aria-describedby': children ? `${inputId}-description` : undefined,
      }),
      [inputId, value, isSelected, handleInputChange, isDisabled, children],
    );

    const visualComponentProps = React.useMemo(
      () => ({
        checked: isSelected,
        disabled: isDisabled,
        'aria-hidden': 'true' as const,
        tabIndex: -1,
      }),
      [isSelected, isDisabled],
    );

    return (
      <Label
        ref={ref}
        htmlFor={inputId}
        className={cn(
          'flex items-center gap-4 px-4 py-3 cursor-pointer border-b border-border last:border-b-0 transition-colors',
          'hover:bg-accent first:rounded-t-lg last:rounded-b-lg',
          isDisabled && 'cursor-not-allowed opacity-50',
          className,
        )}
        {...props}
      >
        <div className="flex-shrink-0">
          {type === 'single' ? (
            <input type="radio" name={groupName} {...inputProps} />
          ) : (
            <input type="checkbox" {...inputProps} />
          )}
          {type === 'single' ? (
            <RadioGroupItem
              value={value}
              {...visualComponentProps}
              className={cn(
                'pointer-events-none',
                '!border-input !text-primary-200',
                'data-[state=checked]:!border-primary-200',
                'data-[state=checked]:!text-primary-200',
              )}
            />
          ) : (
            <Checkbox
              {...visualComponentProps}
              className={cn(
                'pointer-events-none',
                '!border-input',
                'data-[state=checked]:!bg-primary-200',
                'data-[state=indeterminate]:!bg-primary-200',
                'data-[state=checked]:!border-primary-200',
                'data-[state=indeterminate]:!border-primary-200',
                'data-[state=checked]:!text-white',
                'data-[state=indeterminate]:!text-white',
              )}
            />
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'flex-shrink-0 w-6 h-6 flex items-center justify-center',
              iconClassName,
            )}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div
            id={children ? `${inputId}-description` : undefined}
            className="flex text-sm font-normal text-foreground"
          >
            {children}
          </div>
        </div>
      </Label>
    );
  },
);
SelectOption.displayName = 'SelectOption';

export { SelectOption };
