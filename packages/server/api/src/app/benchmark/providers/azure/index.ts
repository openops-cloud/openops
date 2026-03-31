import type { ProviderAdapter, WizardConfig } from '@openops/shared';
import { resolveOptions } from './azure-option-resolver';
import azureConfig from './azure.json';

export const azureProviderAdapter: ProviderAdapter = {
  config: azureConfig as WizardConfig,
  resolveOptions,
};
