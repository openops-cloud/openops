import type { ProviderAdapter, WizardConfig } from '../../provider-adapter';
import { evaluateConditional } from './aws-conditional-step-resolver';
import { resolveOptions } from './aws-option-resolver';
import awsConfig from './aws.json';

export const awsProviderAdapter: ProviderAdapter = {
  config: awsConfig as WizardConfig,
  resolveOptions,
  evaluateConditional,
};
