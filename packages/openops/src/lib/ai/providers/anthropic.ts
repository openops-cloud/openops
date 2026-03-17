// https://docs.anthropic.com/en/docs/about-claude/models/overview
import { createAnthropic } from '@ai-sdk/anthropic';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const anthropicModels = [
  'claude-haiku-4-5',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-0',
  'claude-opus-4-1',
  'claude-opus-4-1-20250805',
  'claude-opus-4-20250514',
  'claude-opus-4-5',
  'claude-opus-4-5-20251101',
  'claude-opus-4-6',
  'claude-sonnet-4-0',
  'claude-sonnet-4-20250514',
  'claude-sonnet-4-5',
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-6',
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
