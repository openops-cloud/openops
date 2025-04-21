import { createCerebras } from '@ai-sdk/cerebras';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

const cerebrasModels = ['llama3.1-8b', 'llama3.1-70b', 'llama-3.3-70b'];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}): LanguageModelV1 {
  return createCerebras({
    apiKey: params.apiKey,
    baseURL: params.baseUrl,
  })(params.model);
}

export const cerebrasProvider: AiProvider = {
  models: cerebrasModels,
  createLanguageModel,
};
