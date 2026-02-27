import {
  OptionIcon,
  SelectAllChangeAction,
  SelectAllCheckbox,
  SelectForm,
  SelectOption,
} from '@openops/components/ui';
import { useCallback } from 'react';
import { DynamicBenchmarkStepProps } from './types';

export const MultiSelectBody = ({
  stepResponse,
  value,
  stepbodyClassName,
  onValueChange,
}: DynamicBenchmarkStepProps) => {
  const handleSelectAll = useCallback(
    (action: SelectAllChangeAction) => {
      onValueChange(
        action === 'selectAll' ? stepResponse.options.map((o) => o.id) : [],
      );
    },
    [onValueChange, stepResponse.options],
  );

  return (
    <div className="rounded-lg bg-background shadow-sm flex flex-col max-h-full overflow-hidden">
      <SelectForm
        type="multi"
        value={value}
        onValueChange={onValueChange}
        className="border-none shadow-none flex flex-col flex-1 min-h-0"
      >
        <div className="px-4 py-3 border-b border-border h-12 flex items-center">
          <SelectAllCheckbox
            id={`select-all-${stepResponse.currentStep}`}
            selectedCount={value.length}
            totalCount={stepResponse.options.length}
            onSelectAllChange={handleSelectAll}
          />
        </div>
        <div className={stepbodyClassName}>
          {stepResponse.options.map((option) => (
            <SelectOption
              key={option.id}
              value={option.id}
              icon={
                <OptionIcon
                  imageLogoUrl={option.imageLogoUrl}
                  displayName={option.displayName}
                />
              }
            >
              {option.displayName}
            </SelectOption>
          ))}
        </div>
      </SelectForm>
    </div>
  );
};

MultiSelectBody.displayName = 'MultiSelectBody';
