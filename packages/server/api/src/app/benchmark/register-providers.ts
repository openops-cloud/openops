import { BenchmarkProviders } from '@openops/shared';
import { registerProvider } from './provider-adapter';
import { awsProviderAdapter } from './providers/aws';
import { azureProviderAdapter } from './providers/azure';

function registerProviders(): void {
  registerProvider(BenchmarkProviders.AWS, awsProviderAdapter);
  registerProvider(BenchmarkProviders.AZURE, azureProviderAdapter);
}

registerProviders();
