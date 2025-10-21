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
}

const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  (
    { className, value, onChange, min, max, step = 1, disabled, ...props },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState<string>(
      value !== undefined ? String(value) : '',
    );

    useEffect(() => {
      setInternalValue(value !== undefined ? String(value) : '');
    }, [value]);

    const handleChange = useCallback(
      (newValue: string) => {
        const validPattern = /^-?\d*\.?\d*$/;
        if (!validPattern.test(newValue)) {
          return;
        }

        setInternalValue(newValue);

        if (newValue === '') {
          onChange?.(undefined);
          return;
        }

        const numValue = parseFloat(newValue);
        if (!isNaN(numValue)) {
          onChange?.(numValue);
        }
      },
      [onChange],
    );

    const handleIncrement = useCallback(() => {
      const currentValue = internalValue === '' ? 0 : parseFloat(internalValue);
      if (isNaN(currentValue)) return;

      let newValue = currentValue + step;
      if (max !== undefined && newValue > max) {
        newValue = max;
      }

      setInternalValue(String(newValue));
      onChange?.(newValue);
    }, [internalValue, step, max, onChange]);

    const handleDecrement = useCallback(() => {
      const currentValue = internalValue === '' ? 0 : parseFloat(internalValue);
      if (isNaN(currentValue)) return;

      let newValue = currentValue - step;
      if (min !== undefined && newValue < min) {
        newValue = min;
      }

      setInternalValue(String(newValue));
      onChange?.(newValue);
    }, [internalValue, step, min, onChange]);

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        const numValue = parseFloat(internalValue);

        if (!isNaN(numValue)) {
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
        props.onBlur?.(e);
      },
      [internalValue, props, min, max, onChange, handleChange],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleIncrement();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleDecrement();
        }
        props.onKeyDown?.(e);
      },
      [props, handleIncrement, handleDecrement],
    );

    return (
      <div className="relative flex items-center">
        <Input
          type="number"
          inputMode="decimal"
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
            disabled={
              disabled ||
              (max !== undefined && parseFloat(internalValue) >= max)
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
            disabled={
              disabled ||
              (min !== undefined && parseFloat(internalValue) <= min)
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
