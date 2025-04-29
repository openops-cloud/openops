import { createCohere } from '@ai-sdk/cohere';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

const cohereModels = [
  'command-a-03-2025',
  'command-r7b-12-2024',
  'command-r-plus-04-2024',
  'command-r-plus',
  'command-r-08-2024',
  'command-r-03-2024',
  'command-r',
  'command',
  'command-nightly',
  'command-light',
  'command-light-nightly',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModelV1 {
  return createCohere({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const cohereProvider: AiProvider = {
  models: cohereModels,
  createLanguageModel,
};
