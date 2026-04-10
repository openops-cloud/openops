import { WizardStepResponse } from '@openops/shared';

export interface DynamicBenchmarkStepProps {
  stepResponse: WizardStepResponse;
  value: string[];
  onValueChange: (value: string[]) => void;
  stepBodyClassName?: string;
}
