import { BenchmarkConfiguration } from './wizard-request';
import { BenchmarkWizardOption } from './wizard-response';

export type WizardContext = {
  benchmarkConfiguration?: BenchmarkConfiguration;
  projectId: string;
  provider: string;
};

export type StaticOptionValue = {
  id: string;
  displayName: string;
  imageLogoUrl?: string;
};

export type WizardStepOptionsSource =
  | { type: 'dynamic'; method: string }
  | { type: 'static'; values: StaticOptionValue[] };

export type WizardStepConditional = {
  when: string;
  onSuccess: {
    optionsSource: WizardStepOptionsSource;
  };
  onFailure?: {
    skipToStep?: string;
  };
};

export type WizardConfigStep = {
  id: string;
  title: string;
  description?: string;
  selectionType: 'single' | 'multi-select';
  optionsSource?: WizardStepOptionsSource;
  nextStep?: string;
  conditional?: WizardStepConditional;
  selectAll?: boolean;
};

export type WizardConfig = {
  provider: string;
  steps: WizardConfigStep[];
};

export type ProviderAdapter = {
  config: WizardConfig;
  resolveOptions(
    method: string,
    context: WizardContext,
  ): Promise<BenchmarkWizardOption[]>;
  evaluateCondition?: (
    condition: string,
    context: WizardContext,
  ) => Promise<boolean>;
};
