import { createMistral } from '@ai-sdk/mistral';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const mistralModels = [
  'codestral-latest',
  'devstral-2512',
  'devstral-medium-2507',
  'devstral-medium-latest',
  'devstral-small-2505',
  'devstral-small-2507',
  'labs-devstral-small-2512',
  'magistral-medium-latest',
  'magistral-small',
  'ministral-3b-latest',
  'ministral-8b-latest',
  'mistral-embed',
  'mistral-large-2411',
  'mistral-large-2512',
  'mistral-large-latest',
  'mistral-medium-2505',
  'mistral-medium-2508',
  'mistral-medium-latest',
  'mistral-nemo',
  'mistral-small-2506',
  'mistral-small-latest',
  'open-mistral-7b',
  'open-mixtral-8x22b',
  'open-mixtral-8x7b',
  'pixtral-12b',
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
