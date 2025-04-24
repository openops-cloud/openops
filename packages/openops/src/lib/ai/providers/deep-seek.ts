import { createDeepSeek } from '@ai-sdk/deepseek';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

const deepSeekModels = ['deepseek-chat', 'deepseek-reasoner'];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}): LanguageModelV1 {
  return createDeepSeek({
    apiKey: params.apiKey,
    baseURL: params.baseUrl,
  })(params.model);
}

export const deepseekProvider: AiProvider = {
  models: deepSeekModels,
  createLanguageModel,
};
