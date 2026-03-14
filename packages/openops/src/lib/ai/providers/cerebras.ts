import { createCerebras } from '@ai-sdk/cerebras';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const cerebrasModels = [
  'gpt-oss-120b',
  'llama3.1-8b',
  'qwen-3-235b-a22b-instruct-2507',
  'qwen-3-235b-a22b-thinking-2507',
  'zai-glm-4.6',
  'zai-glm-4.7',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createCerebras({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const cerebrasProvider: AiProvider = {
  models: cerebrasModels,
  createLanguageModel,
};
