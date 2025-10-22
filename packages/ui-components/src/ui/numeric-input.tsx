import { ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';
import { forwardRef, useCallback, useEffect, useState } from 'react';

import { cn } from '../lib/cn';
import { Button } from './button';
import { Input } from './input';

export interface NumericInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'onChange'
  > {
  value?: number;
  onChange?: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  integerOnly?: boolean;
}

const extractValue = (value: number | undefined): string => {
  return value === undefined ? '' : String(value);
};

const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      className,
      value,
      onChange,
      min,
      max,
      step = 1,
      integerOnly = false,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState<string>(
      extractValue(value),
    );

    useEffect(() => {
      setInternalValue(extractValue(value));
    }, [value]);

    const handleChange = useCallback(
      (newValue: string) => {
        const validPattern = integerOnly ? /^-?\d*$/ : /^-?\d*\.?\d*$/;
        if (!validPattern.test(newValue)) {
          return;
        }

        setInternalValue(newValue);

        if (newValue === '') {
          onChange?.(undefined);
          return;
        }

        const numValue = integerOnly
          ? Number.parseInt(newValue, 10)
          : Number.parseFloat(newValue);
        if (!Number.isNaN(numValue)) {
          onChange?.(numValue);
        }
      },
      [onChange, integerOnly],
    );

    const handleIncrement = useCallback(() => {
      const currentValue =
        internalValue === '' ? 0 : Number.parseFloat(internalValue);
      if (Number.isNaN(currentValue)) return;

      let newValue = currentValue + step;
      if (max !== undefined && newValue > max) {
        newValue = max;
      }

      setInternalValue(String(newValue));
      onChange?.(newValue);
    }, [internalValue, step, max, onChange]);

    const handleDecrement = useCallback(() => {
      const currentValue =
        internalValue === '' ? 0 : Number.parseFloat(internalValue);
      if (Number.isNaN(currentValue)) return;

      let newValue = currentValue - step;
      if (min !== undefined && newValue < min) {
        newValue = min;
      }

      setInternalValue(String(newValue));
      onChange?.(newValue);
    }, [internalValue, step, min, onChange]);

    const applyValidation = useCallback(() => {
      const numValue = Number.parseFloat(internalValue);
      if (!Number.isNaN(numValue)) {
        let clampedValue = numValue;
        if (min !== undefined && clampedValue < min) {
          clampedValue = min;
        }
        if (max !== undefined && clampedValue > max) {
          clampedValue = max;
        }
        if (clampedValue !== numValue) {
          setInternalValue(String(clampedValue));
          onChange?.(clampedValue);
        }
      } else {
        handleChange(min ? String(min) : '');
      }
    }, [internalValue, min, max, onChange, handleChange]);

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        applyValidation();
        props.onBlur?.(e);
      },
      [applyValidation, props],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleIncrement();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleDecrement();
        } else if (e.key === 'Enter') {
          applyValidation();
        }
        props.onKeyDown?.(e);
      },
      [props, handleIncrement, handleDecrement, applyValidation],
    );

    return (
      <div className="relative flex items-center">
        <Input
          type="text"
          inputMode={integerOnly ? 'numeric' : 'decimal'}
          className={cn('pr-8 overflow-y-hidden', className)}
          ref={ref}
          value={internalValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          {...props}
        />
        <div className="absolute right-1 flex flex-col">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleIncrement}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            disabled={
              disabled ||
              (max !== undefined && Number.parseFloat(internalValue) >= max)
            }
            className="h-[50%] w-6 p-0"
            tabIndex={-1}
          >
            <ChevronUp className="h-[50%] w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleDecrement}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            disabled={
              disabled ||
              (min !== undefined && Number.parseFloat(internalValue) <= min)
            }
            className="h-[50%] w-6 p-0"
            tabIndex={-1}
          >
            <ChevronDown className="h-[50%] w-3" />
          </Button>
        </div>
      </div>
    );
  },
);
NumericInput.displayName = 'NumericInput';

export { NumericInput };
