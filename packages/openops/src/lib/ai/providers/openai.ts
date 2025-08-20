import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const openAiModels = [
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'o1',
  'o1-2024-12-17',
  'gpt-4.1',
  'gpt-4.1-2025-04-14',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
  'gpt-4o-2024-05-13',
  'gpt-4o-2024-08-06',
  'gpt-4o-2024-11-20',
  'gpt-4-0613',
  'chatgpt-4o-latest',
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
