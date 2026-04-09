// https://platform.minimax.io/docs/api-reference/text-openai-api
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const minimaxModels = ['MiniMax-M2.7', 'MiniMax-M2.7-highspeed'];

const MINIMAX_BASE_URL = 'https://api.minimax.io/v1';

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createOpenAICompatible({
    name: 'minimax',
    apiKey: params.apiKey,
    baseURL: MINIMAX_BASE_URL,
    ...params.providerSettings,
  })(params.model);
}

export const minimaxProvider: AiProvider = {
  models: minimaxModels,
  createLanguageModel,
};
