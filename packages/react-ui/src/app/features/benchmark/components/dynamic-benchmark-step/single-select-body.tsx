import { SelectForm, SelectOption } from '@openops/components/ui';
import { OptionIcon } from './option-icon';
import { DynamicBenchmarkStepProps } from './types';

export const SingleSelectBody = ({
  stepResponse,
  value,
  onValueChange,
}: DynamicBenchmarkStepProps) => (
  <SelectForm
    type="single"
    value={value[0] ?? ''}
    onValueChange={(v) => onValueChange([v])}
  >
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
);

SingleSelectBody.displayName = 'SingleSelectBody';
