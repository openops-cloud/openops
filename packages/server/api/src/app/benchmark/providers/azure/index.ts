import type { ProviderAdapter, WizardConfig } from '../../provider-adapter';
import { resolveOptions } from './azure-option-resolver';
import azureConfig from './azure.json';

export const azureProviderAdapter: ProviderAdapter = {
  config: azureConfig as WizardConfig,
  resolveOptions,
};
