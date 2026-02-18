import { BenchmarkConfiguration, BenchmarkWizardOption } from '@openops/shared';
import { throwValidationError } from './errors';

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
  onSuccess?: {
    optionsSource?: WizardStepOptionsSource;
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
};

const providers = new Map<string, ProviderAdapter>();

export function registerProvider(
  provider: string,
  adapter: ProviderAdapter,
): void {
  providers.set(provider.toLowerCase(), adapter);
}

export function getProvider(provider: string): ProviderAdapter {
  const normalized = provider.toLowerCase();
  const adapter = providers.get(normalized);
  if (!adapter) {
    throwValidationError(`Provider not found: ${provider}`);
  }
  return adapter;
}
