import { ProviderAdapter, WizardConfig } from '@openops/shared';
import { evaluateCondition } from './resolvers/aws/aws-condition-resolver';
import { resolveOptions } from './resolvers/aws/aws-option-resolver';

export const awsProviderAdapter = (config: WizardConfig): ProviderAdapter => {
  return {
    config,
    resolveOptions,
    evaluateCondition,
  };
};
