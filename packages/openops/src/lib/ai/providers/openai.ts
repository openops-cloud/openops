import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const openAiModels = [
  'codex-mini-latest',
  'gpt-3.5-turbo',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
  'gpt-4o-2024-05-13',
  'gpt-4o-2024-08-06',
  'gpt-4o-2024-11-20',
  'gpt-4o-mini',
  'gpt-5',
  'gpt-5-chat-latest',
  'gpt-5-codex',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-5-pro',
  'gpt-5.1',
  'gpt-5.1-chat-latest',
  'gpt-5.1-codex',
  'gpt-5.1-codex-max',
  'gpt-5.1-codex-mini',
  'gpt-5.2',
  'gpt-5.2-chat-latest',
  'gpt-5.2-codex',
  'gpt-5.2-pro',
  'gpt-5.3-codex',
  'gpt-5.3-codex-spark',
  'gpt-5.4',
  'gpt-5.4-pro',
  'o1',
  'o1-mini',
  'o1-preview',
  'o1-pro',
  'o3',
  'o3-deep-research',
  'o3-mini',
  'o3-pro',
  'o4-mini',
  'o4-mini-deep-research',
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
