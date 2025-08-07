import { createMistral } from '@ai-sdk/mistral';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

const mistralModels = [
  'ministral-3b-latest',
  'ministral-8b-latest',
  'mistral-large-latest',
  'mistral-small-latest',
  'pixtral-large-latest',
  'pixtral-12b-2409',
  'open-mixtral-8x22b',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModelV1 {
  return createMistral({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const mistralProvider: AiProvider = {
  models: mistralModels,
  createLanguageModel,
};
