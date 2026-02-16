import { registerProvider } from './provider-adapter';
import { awsProviderAdapter } from './providers/aws';

function registerProviders(): void {
  registerProvider('aws', awsProviderAdapter);
}

registerProviders();
