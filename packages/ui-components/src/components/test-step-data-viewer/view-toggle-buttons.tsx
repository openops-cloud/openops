import { t } from 'i18next';
import {
  DataStatePropInterceptor,
  ToggleGroup,
  ToggleGroupItem,
} from '../../ui/toggle-group';
import { TooltipWrapper } from '../tooltip-wrapper';

export enum JsonViewType {
  Input = 'Input',
  Output = 'Output',
}

const VIEW_INPUT_OPTIONS = {
  input: {
    value: JsonViewType.Input,
    label: t('Input'),
    tooltipText: t('View input data'),
  },
  output: {
    value: JsonViewType.Output,
    label: t('Output'),
    tooltipText: t('View output data'),
  },
};

const ViewToggleButton = ({
  tooltipText,
  value,
  label,
}: {
  tooltipText: string;
  value: string;
  label: string;
}) => {
  return (
    <TooltipWrapper tooltipText={tooltipText} tooltipPlacement="bottom">
      <DataStatePropInterceptor>
        <ToggleGroupItem
          value={value}
          size="xs"
          className={
            'w-[66px] h-6 px-2 py-1 text-sm font-normal transition-colors data-[state=on]:bg-gray-200 dark:data-[state=on]:bg-gray-800 data-[state=on]:shadow-sm border-0 dark:data-[state=off]:text-gray-400 data-[state=off]:hover:bg-gray-200 dark:data-[state=off]:hover:bg-gray-800 rounded-[4px]'
          }
        >
          {label}
        </ToggleGroupItem>
      </DataStatePropInterceptor>
    </TooltipWrapper>
  );
};

type ViewToggleButtonsProps = {
  viewType: JsonViewType;
  disabled: boolean;
  onViewTypeChange: (value: JsonViewType) => void;
};

export const ViewToggleButtons = ({
  viewType,
  disabled,
  onViewTypeChange,
}: ViewToggleButtonsProps) => {
  const handleValueChange = (value: JsonViewType) => {
    if (value) {
      onViewTypeChange(value);
    }
  };

  return (
    <ToggleGroup
      type="single"
      value={viewType}
      onValueChange={handleValueChange}
      disabled={disabled}
      className={
        'w-fit h-7 flex bg-background border rounded-[4px] p-[1px] gap-[2px]'
      }
      variant="outline"
      size="xs"
    >
      {Object.values(VIEW_INPUT_OPTIONS).map((option) => (
        <ViewToggleButton
          tooltipText={option.tooltipText}
          value={option.value}
          label={option.label}
          key={option.value}
        />
      ))}
    </ToggleGroup>
  );
};
