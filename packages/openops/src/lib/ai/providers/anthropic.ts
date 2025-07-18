import { createAnthropic } from '@ai-sdk/anthropic';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

const anthropicModels = [
  'claude-4-opus-20250514',
  'claude-4-sonnet-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-latest',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-haiku-latest',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-latest',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModelV1 {
  return createAnthropic({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const anthropicProvider: AiProvider = {
  models: anthropicModels,
  createLanguageModel,
};
