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
};

const ToggleSwitch = ({
  options,
  defaultValue,
  onChange,
  disabled,
  className,
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
          <ToggleGroupItem
            value={option.value}
            size="xs"
            className={cn(
              'w-[66px] px-2 py-1',
              'rounded text-sm font-normal transition-colors aria-checked:bg-gray-200 dark:aria-checked:bg-gray-800',
              'border-0',
              'rounded-[4px]',
            )}
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
