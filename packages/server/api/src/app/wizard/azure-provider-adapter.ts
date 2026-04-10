import { ProviderAdapter, WizardConfig } from '@openops/shared';
import { resolveOptions } from './resolvers/azure/azure-option-resolver';

export const azureProviderAdapter = (config: WizardConfig): ProviderAdapter => {
  return {
    config,
    resolveOptions,
  };
};
