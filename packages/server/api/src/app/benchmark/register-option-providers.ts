import { registerOptionProvider } from './option-provider';
import { awsOptionProvider } from './providers/aws/aws-option-provider';

function registerOptionProviders(): void {
  registerOptionProvider('aws', awsOptionProvider);
}

registerOptionProviders();
