import { BenchmarkProviders, ProviderAdapter } from '@openops/shared';
import { throwValidationError } from '../errors';
import { awsProviderAdapter } from './aws';
import { azureProviderAdapter } from './azure';

const providers = new Map<string, ProviderAdapter>();

export function getProvider(provider: string): ProviderAdapter {
  const adapter = providers.get(provider);

  if (!adapter) {
    throwValidationError(`Provider not found: ${provider}`);
  }

  return adapter;
}

function registerProviders(): void {
  providers.set(BenchmarkProviders.AWS, awsProviderAdapter);
  providers.set(BenchmarkProviders.AZURE, azureProviderAdapter);
}

registerProviders();
