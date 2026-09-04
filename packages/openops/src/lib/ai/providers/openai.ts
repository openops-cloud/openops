// https://platform.openai.com/docs/models
import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const openAiModels = [
  'gpt-4.1',
  'gpt-4.1-2025-04-14',
  'gpt-4.1-mini',
  'gpt-4o',
  'gpt-4o-2024-08-06',
  'gpt-4o-2024-11-20',
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-5.1',
  'gpt-5.1-2025-11-13',
  'gpt-5.2',
  'gpt-5.2-2025-12-11',
  'gpt-5.2-pro',
  'gpt-5.2-pro-2025-12-11',
  'gpt-5.4',
  'gpt-5.4-2026-03-05',
  'gpt-5.4-pro',
  'gpt-5.4-pro-2026-03-05',
  'gpt-5.5',
  'gpt-5.5-2026-04-23',
  'gpt-5.6',
  'gpt-5.6-luna',
  'gpt-5.6-sol',
  'gpt-5.6-terra',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createOpenAI({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const openAiProvider: AiProvider = {
  models: openAiModels,
  createLanguageModel,
};
