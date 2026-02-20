import {
  OptionIcon,
  SelectAllChangeAction,
  SelectAllCheckbox,
  SelectForm,
  SelectOption,
} from '@openops/components/ui';
import { useCallback } from 'react';
import { EmptyOptionsPlaceholder } from './empty-options-placeholder';
import { DynamicBenchmarkStepProps } from './types';

export const MultiSelectBody = ({
  stepResponse,
  value,
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

  if (stepResponse.options.length === 0) {
    return (
      <div className="rounded-lg bg-background shadow-sm">
        <EmptyOptionsPlaceholder />
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-background shadow-sm">
      <SelectForm
        type="multi"
        value={value}
        onValueChange={onValueChange}
        className="border-none shadow-none"
      >
        <div className="px-4 py-3 border-b border-border h-12 flex items-center">
          <SelectAllCheckbox
            id={`select-all-${stepResponse.currentStep}`}
            selectedCount={value.length}
            totalCount={stepResponse.options.length}
            onSelectAllChange={handleSelectAll}
          />
        </div>
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
      </SelectForm>
    </div>
  );
};

MultiSelectBody.displayName = 'MultiSelectBody';
