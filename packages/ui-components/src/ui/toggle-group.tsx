'use client';

import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../lib/cn';
import { toggleVariants } from './toggle';

import { Slot } from '@radix-ui/react-slot';
import { forwardRef, type ComponentProps, type ElementType } from 'react';

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: 'default',
  variant: 'default',
});

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => {
  const contextValue = React.useMemo(
    () => ({ variant, size }),
    [variant, size],
  );

  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      className={cn('flex items-center justify-center gap-1', className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={contextValue}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
});

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

const DataStatePropInterceptor = forwardRef<
  HTMLElement,
  ComponentProps<ElementType>
>((props, ref) => {
  const { 'data-state': dataState, children, ...rest } = props;
  if (dataState) {
    return (
      <span data-state={dataState}>
        <Slot {...rest} ref={ref}>
          {children}
        </Slot>
      </span>
    );
  }
  return (
    <Slot {...rest} ref={ref}>
      {children}
    </Slot>
  );
});

DataStatePropInterceptor.displayName = 'DataStatePropInterceptor';

export { DataStatePropInterceptor, ToggleGroup, ToggleGroupItem };
