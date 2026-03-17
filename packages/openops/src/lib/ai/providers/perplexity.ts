// https://docs.perplexity.ai/guides/model-cards
import { createPerplexity } from '@ai-sdk/perplexity';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const perplexityModels = [
  'sonar',
  'sonar-pro',
  'sonar-reasoning',
  'sonar-reasoning-pro',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createPerplexity({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const perplexityProvider: AiProvider = {
  models: perplexityModels,
  createLanguageModel,
};
