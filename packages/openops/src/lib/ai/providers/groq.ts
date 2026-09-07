// https://console.groq.com/docs/models
import { createGroq } from '@ai-sdk/groq';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const groqModels = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.6-27b',
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
