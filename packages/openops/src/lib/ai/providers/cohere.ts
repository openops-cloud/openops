import { createCohere } from '@ai-sdk/cohere';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const cohereModels = [
  'c4ai-aya-expanse-32b',
  'c4ai-aya-expanse-8b',
  'c4ai-aya-vision-32b',
  'c4ai-aya-vision-8b',
  'command-a-03-2025',
  'command-a-reasoning-08-2025',
  'command-a-translate-08-2025',
  'command-a-vision-07-2025',
  'command-r-08-2024',
  'command-r-plus-08-2024',
  'command-r7b-12-2024',
  'command-r7b-arabic-02-2025',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createCohere({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const cohereProvider: AiProvider = {
  models: cohereModels,
  createLanguageModel,
};
