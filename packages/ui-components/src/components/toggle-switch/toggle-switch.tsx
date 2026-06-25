import { useState } from 'react';
import { cn } from '../../lib/cn';
import { ToggleGroup, ToggleGroupItem } from '../../ui/toggle-group';
import { TooltipWrapper } from '../tooltip-wrapper';

export type ToggleSwitchOption = {
  value: string;
  label: string;
  tooltipText?: string;
};

type Props = {
  options: ToggleSwitchOption[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'pill';
  size?: 'md' | 'sm';
};

const ToggleSwitch = ({
  options,
  defaultValue,
  onChange,
  disabled,
  className,
  variant = 'default',
  size = 'md',
}: Props) => {
  const [selectedValue, setSelectedValue] = useState<string>(
    defaultValue ?? options[0].value,
  );

  const handleValueChange = (value: string) => {
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
        'inline-flex border gap-[2px]',
        {
          'bg-gray-100 dark:bg-gray-900 rounded-[40px]': variant === 'pill',
          'py-[6px] px-[8px] h-[54px]': variant === 'pill' && size === 'md',
          'py-[3px] px-[5px] h-[38px]': variant === 'pill' && size === 'sm',
          'bg-background rounded-[4px] p-[1px]': variant !== 'pill',
        },
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
          <ToggleGroupItem
            value={option.value}
            size="xs"
            className={cn('text-sm transition-colors border-0', {
              'rounded-[40px] font-medium aria-checked:!bg-primary-200 aria-checked:!text-background':
                variant === 'pill',
              'px-5 h-[42px]': variant === 'pill' && size === 'md',
              'px-4 h-[30px]': variant === 'pill' && size === 'sm',
              'w-[66px] px-2 py-1 rounded-[4px] font-normal aria-checked:bg-gray-200 dark:aria-checked:bg-gray-800':
                variant !== 'pill',
            })}
          >
            {option.label}
          </ToggleGroupItem>
        </TooltipWrapper>
      ))}
    </ToggleGroup>
  );
};

ToggleSwitch.displayName = 'DynamicToggle';

export { ToggleSwitch };
