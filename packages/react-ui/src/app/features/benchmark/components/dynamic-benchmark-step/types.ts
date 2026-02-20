import { BenchmarkWizardStepResponse } from '@openops/shared';

export interface DynamicBenchmarkStepProps {
  stepResponse: BenchmarkWizardStepResponse;
  value: string[];
  onValueChange: (value: string[]) => void;
}
