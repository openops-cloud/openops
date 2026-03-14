import { createMistral } from '@ai-sdk/mistral';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const mistralModels = [
  'magistral-medium-2506',
  'magistral-medium-2507',
  'magistral-small-2506',
  'magistral-small-2507',
  'ministral-3b-latest',
  'ministral-8b-latest',
  'mistral-large-latest',
  'mistral-medium-2505',
  'mistral-medium-2508',
  'mistral-medium-latest',
  'mistral-small-latest',
  'open-mistral-7b',
  'open-mixtral-8x22b',
  'open-mixtral-8x7b',
  'pixtral-12b-2409',
  'pixtral-large-latest',
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
