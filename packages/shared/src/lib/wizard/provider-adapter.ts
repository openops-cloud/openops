import { WizardState } from './wizard-request';
import { WizardOption } from './wizard-response';

export type WizardContext = {
  wizardState?: WizardState;
  projectId: string;
  provider: string;
};

export type StaticOptionValue = {
  id: string;
  displayName: string;
  imageLogoUrl?: string;
  items?: WizardOption[];
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
  selectionType: 'single' | 'multi-select' | 'nested-multi-select';
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
  ): Promise<WizardOption[]>;
  evaluateCondition?: (
    condition: string,
    context: WizardContext,
  ) => Promise<boolean>;
};
