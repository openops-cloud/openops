import { BenchmarkProviders } from '@openops/shared';
import { registerProvider } from './provider-adapter';
import { awsProviderAdapter } from './providers/aws';

function registerProviders(): void {
  registerProvider(BenchmarkProviders.AWS, awsProviderAdapter);
}

registerProviders();
