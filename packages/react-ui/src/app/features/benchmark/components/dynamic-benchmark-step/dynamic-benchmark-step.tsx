import { useTheme } from '@/app/common/providers/theme-provider';
import {
  Markdown,
  StepBody,
  StepDescription,
  StepTitle,
} from '@openops/components/ui';
import { MultiSelectBody } from './multi-select-body';
import { SingleSelectBody } from './single-select-body';
import { DynamicBenchmarkStepProps } from './types';

export const DynamicBenchmarkStep = ({
  stepResponse,
  value,
  onValueChange,
}: DynamicBenchmarkStepProps) => {
  const isMultiSelect = stepResponse.selectionType === 'multi-select';
  const { theme } = useTheme();

  return (
    <>
      <StepTitle>{stepResponse.title}</StepTitle>
      {stepResponse.description && (
        <StepDescription>
          <Markdown
            theme={theme}
            containerClassName="border-none p-0"
            markdown={stepResponse.description}
          />
        </StepDescription>
      )}
      <StepBody>
        {isMultiSelect ? (
          <MultiSelectBody
            stepResponse={stepResponse}
            value={value}
            onValueChange={onValueChange}
          />
        ) : (
          <SingleSelectBody
            stepResponse={stepResponse}
            value={value}
            onValueChange={onValueChange}
          />
        )}
      </StepBody>
    </>
  );
};

DynamicBenchmarkStep.displayName = 'DynamicBenchmarkStep';
