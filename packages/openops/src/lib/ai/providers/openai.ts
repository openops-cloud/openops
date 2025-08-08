import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

const openAiModels = [
  'o1-2024-12-17',
  'gpt-4.1',
  'gpt-4.1-2025-04-14',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o-2024-05-13',
  'gpt-4o-2024-08-06',
  'gpt-4o-2024-11-20',
  'gpt-4o-audio-preview',
  'gpt-4o-audio-preview-2024-10-01',
  'gpt-4o-audio-preview-2024-12-17',
  'gpt-4o-search-preview',
  'gpt-4o-search-preview-2025-03-11',
  'gpt-4-0613',
  'gpt-4.5-preview',
  'gpt-4.5-preview-2025-02-27',
  'chatgpt-4o-latest',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModelV1 {
  return createOpenAI({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const openAiProvider: AiProvider = {
  models: openAiModels,
  createLanguageModel,
};
