import { createAnthropic } from '@ai-sdk/anthropic';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const anthropicModels = [
  'claude-sonnet-4-5-20250929',
  'claude-4-opus-20250514',
  'claude-4-sonnet-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-latest',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-haiku-latest',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-latest',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createAnthropic({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const anthropicProvider: AiProvider = {
  models: anthropicModels,
  createLanguageModel,
};
