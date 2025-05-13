import { createPerplexity } from '@ai-sdk/perplexity';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

const perplexityModels = [
  'sonar-reasoning-pro',
  'sonar-reasoning',
  'sonar-pro',
  'sonar',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModelV1 {
  return createPerplexity({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const perplexityProvider: AiProvider = {
  models: perplexityModels,
  createLanguageModel,
};
