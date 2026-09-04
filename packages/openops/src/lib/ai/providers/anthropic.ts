// https://docs.anthropic.com/en/docs/about-claude/models/overview
import { createAnthropic } from '@ai-sdk/anthropic';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const anthropicModels = [
  'claude-fable-5',
  'claude-fable-5-1',
  'claude-haiku-4-5',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-5',
  'claude-opus-4-5-20251101',
  'claude-opus-4-6',
  'claude-opus-4-7',
  'claude-opus-4-8',
  'claude-opus-5',
  'claude-sonnet-4-5',
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-6',
  'claude-sonnet-5',
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
