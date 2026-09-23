// https://docs.cohere.com/docs/models
import { createCohere } from '@ai-sdk/cohere';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const cohereModels = [
  'command-a-03-2025',
  'command-a-reasoning-08-2025',
  'command-r',
  'command-r-08-2024',
  'command-r-plus',
  'command-r7b-12-2024',
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
