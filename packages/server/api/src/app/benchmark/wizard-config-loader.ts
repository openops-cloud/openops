import { ApplicationError, ErrorCode } from '@openops/shared';
import awsWizardConfig from './wizard-config/aws.json';

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
  skipToStep: string;
};

export type WizardConfigStep = {
  id: string;
  title: string;
  description?: string;
  selectionType: 'single' | 'multi-select';
  optionsSource?: WizardStepOptionsSource;
  nextStep?: string;
  conditional?: WizardStepConditional;
  action?: string;
};

export type WizardConfig = {
  provider: string;
  steps: WizardConfigStep[];
};

const WIZARD_CONFIGS: Record<string, WizardConfig> = {
  aws: awsWizardConfig as WizardConfig,
};

export function getWizardConfig(provider: string): WizardConfig {
  const config = WIZARD_CONFIGS[provider];
  if (!config) {
    const message = `Wizard config not found for provider: ${provider}`;
    throw new ApplicationError(
      { code: ErrorCode.VALIDATION, params: { message } },
      message,
    );
  }
  return config;
}
