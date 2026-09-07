// https://docs.x.ai/docs/models
import { createXai } from '@ai-sdk/xai';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const xaiModels = [
  'grok-4.20-reasoning',
  'grok-4.3',
  'grok-4.5',
  'grok-4.6',
  'grok-latest',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createXai({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const xaiProvider: AiProvider = {
  models: xaiModels,
  createLanguageModel,
};
