import { createDeepSeek } from '@ai-sdk/deepseek';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

const deepSeekModels = ['deepseek-chat', 'deepseek-reasoner'];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModelV1 {
  return createDeepSeek({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const deepseekProvider: AiProvider = {
  models: deepSeekModels,
  createLanguageModel,
};
