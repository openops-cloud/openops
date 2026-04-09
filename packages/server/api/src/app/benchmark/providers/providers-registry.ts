import {
  BenchmarkProviders,
  ProviderAdapter,
  throwValidationError,
  WizardConfig,
} from '@openops/shared';
import { awsProviderAdapter } from '../../wizard/aws-provider-adapter';
import { azureProviderAdapter } from '../../wizard/azure-provider-adapter';
import awsConfig from './aws/aws.json';
import azureConfig from './azure/azure.json';

const providers = new Map<string, ProviderAdapter>();

export function getProvider(provider: string): ProviderAdapter {
  const adapter = providers.get(provider);

  if (!adapter) {
    throwValidationError(`Provider not found: ${provider}`);
  }

  return adapter;
}

function registerProviders(): void {
  providers.set(
    BenchmarkProviders.AWS,
    awsProviderAdapter(awsConfig as WizardConfig),
  );

  providers.set(
    BenchmarkProviders.AZURE,
    azureProviderAdapter(azureConfig as WizardConfig),
  );
}

registerProviders();
