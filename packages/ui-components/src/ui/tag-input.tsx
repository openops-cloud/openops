'use client';

import { XIcon } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';

import { cn } from '../lib/cn';

import { Badge } from './badge';
import { Button } from './button';
import type { InputProps } from './input';

type TagInputProps = Omit<InputProps, 'value' | 'onChange'> & {
  value?: ReadonlyArray<string>;
  onChange: (value: ReadonlyArray<string>) => void;
};

const SEPARATOR = ',';

const TagInput = forwardRef<HTMLInputElement, TagInputProps>((props, ref) => {
  const {
    className,
    value = [],
    onChange,
    disabled,
    placeholder,
    ...domProps
  } = props;

  const [pendingDataPoint, setPendingDataPoint] = useState('');

  useEffect(() => {
    if (pendingDataPoint.includes(SEPARATOR)) {
      const newDataPoints = new Set(
        [...value, ...pendingDataPoint.split(SEPARATOR)].flatMap((x) => {
          const trimmedX = x.trim();
          return trimmedX.length > 0 ? [trimmedX] : [];
        }),
      );
      onChange(Array.from(newDataPoints));
      setPendingDataPoint('');
    }
  }, [pendingDataPoint, onChange, value]);

  const addPendingDataPoint = () => {
    if (pendingDataPoint) {
      const newDataPoints = new Set(
        [...value, ...pendingDataPoint.split(SEPARATOR)].flatMap((x) => {
          const trimmedX = x.trim();
          return trimmedX.length > 0 ? [trimmedX] : [];
        }),
      );
      onChange(Array.from(newDataPoints));
      setPendingDataPoint('');
    }
  };

  return (
    <div
      className={cn(
        // caveat: :has() variant requires tailwind v3.4 or above: https://tailwindcss.com/blog/tailwindcss-v3-4#new-has-variant
        'flex min-h-10 w-full flex-wrap gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background has-[:focus-visible]:outline-none has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1',
        { 'cursor-not-allowed opacity-50': disabled },
        className,
      )}
    >
      {value.map((item) => (
        <Badge key={item} variant={'secondary'}>
          <span className="text-xs font-medium">{item}</span>
          <Button
            variant={'ghost'}
            size={'icon'}
            className={'ml-2 h-3 w-3'}
            aria-label={`Remove ${item}`}
            disabled={disabled}
            onClick={() => {
              onChange(value.filter((i) => i !== item));
            }}
          >
            <XIcon className={'h-3 w-3'} />
          </Button>
        </Badge>
      ))}
      <input
        className={
          'placeholder:text-muted-foreground flex-1 bg-transparent outline-none disabled:cursor-not-allowed'
        }
        value={pendingDataPoint}
        disabled={disabled}
        placeholder={value.length === 0 ? placeholder : undefined}
        onChange={(e) => setPendingDataPoint(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === SEPARATOR) {
            e.preventDefault();
            addPendingDataPoint();
          } else if (
            e.key === 'Backspace' &&
            pendingDataPoint.length === 0 &&
            value.length > 0
          ) {
            e.preventDefault();
            onChange(value.slice(0, -1));
          }
        }}
        {...domProps}
        ref={ref}
      />
    </div>
  );
});

TagInput.displayName = 'TagInput';

export { TagInput };
