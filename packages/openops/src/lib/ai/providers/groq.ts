import { createGroq } from '@ai-sdk/groq';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

const groqModels = [
  'gemma2-9b-it',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama-guard-3-8b',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen-qwq-32b',
  'mistral-saba-24b',
  'qwen-2.5-32b',
  'deepseek-r1-distill-qwen-32b',
  'deepseek-r1-distill-llama-70b',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}): LanguageModelV1 {
  return createGroq({
    apiKey: params.apiKey,
    baseURL: params.baseUrl,
  })(params.model);
}

export const groqProvider: AiProvider = {
  models: groqModels,
  createLanguageModel,
};
