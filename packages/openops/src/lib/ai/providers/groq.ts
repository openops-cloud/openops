import { createGroq } from '@ai-sdk/groq';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const groqModels = [
  'gemma2-9b-it',
  'llama-3.3-70b-versatile',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'mistral-saba-24b',
  'qwen-2.5-32b',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createGroq({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const groqProvider: AiProvider = {
  models: groqModels,
  createLanguageModel,
};
