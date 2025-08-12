import { createDeepSeek } from '@ai-sdk/deepseek';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const deepSeekModels = ['deepseek-chat'];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createDeepSeek({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const deepseekProvider: AiProvider = {
  models: deepSeekModels,
  createLanguageModel,
};
