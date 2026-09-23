// https://docs.mistral.ai/getting-started/models/models_overview/
import { createMistral } from '@ai-sdk/mistral';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const mistralModels = [
  'glm-5-2',
  'magistral-medium-latest',
  'magistral-small-latest',
  'mistral-large-2512',
  'mistral-large-latest',
  'mistral-medium-2604',
  'mistral-medium-3-5',
  'mistral-medium-3.5',
  'mistral-medium-latest',
  'mistral-small-2603',
  'mistral-small-latest',
  'zai-glm-5-2',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createMistral({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const mistralProvider: AiProvider = {
  models: mistralModels,
  createLanguageModel,
};
