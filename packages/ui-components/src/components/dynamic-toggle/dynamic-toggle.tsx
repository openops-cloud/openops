import { useState } from 'react';
import { cn } from '../../lib/cn';
import {
  DataStatePropInterceptor,
  ToggleGroup,
  ToggleGroupItem,
} from '../../ui/toggle-group';
import { TooltipWrapper } from '../tooltip-wrapper';

export type DynamicToggleValue = 'Static' | 'Dynamic';
export const DYNAMIC_TOGGLE_VALUES: Record<string, DynamicToggleValue> = {
  STATIC: 'Static',
  DYNAMIC: 'Dynamic',
};

export type DynamicToggleOption = {
  value: DynamicToggleValue;
  label: string;
  tooltipText?: string;
};

type Props = {
  options: DynamicToggleOption[];
  defaultValue?: DynamicToggleValue;
  onChange?: (value: DynamicToggleValue) => void;
  disabled?: boolean;
  className?: string;
};

const DynamicToggle = ({
  options,
  defaultValue,
  onChange,
  disabled,
  className,
}: Props) => {
  const [selectedValue, setSelectedValue] = useState<DynamicToggleValue>(
    defaultValue ?? (options.length > 0 ? options[0].value : 'Static'),
  );

  const handleValueChange = (value: DynamicToggleValue) => {
    if (value) {
      setSelectedValue(value);
      onChange?.(value);
    }
  };

  return (
    <ToggleGroup
      type="single"
      disabled={disabled}
      value={selectedValue}
      onValueChange={handleValueChange}
      className={cn(
        'inline-flex bg-background border rounded-[4px] p-[1px] gap-[2px]',
        className,
      )}
      variant="outline"
      size="xs"
    >
      {options.map((option) => (
        <TooltipWrapper
          key={option.value}
          tooltipText={option.tooltipText ?? ''}
          tooltipPlacement="bottom"
        >
          <DataStatePropInterceptor>
            <ToggleGroupItem
              value={option.value}
              size="xs"
              className={cn(
                'w-[66px] px-2 py-1',
                'rounded text-sm font-normal transition-colors data-[state=on]:bg-gray-200 dark:data-[state=on]:bg-gray-800 data-[state=on]:shadow-sm',
                'border-0 dark:data-[state=off]:text-gray-400 data-[state=off]:hover:bg-gray-200 dark:data-[state=off]:hover:bg-gray-800',
                'rounded-[4px]',
              )}
            >
              {option.label}
            </ToggleGroupItem>
          </DataStatePropInterceptor>
        </TooltipWrapper>
      ))}
    </ToggleGroup>
  );
};

DynamicToggle.displayName = 'DynamicToggle';

export { DynamicToggle };
