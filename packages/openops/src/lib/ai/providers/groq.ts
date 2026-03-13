import { createGroq } from '@ai-sdk/groq';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const groqModels = [
  'deepseek-r1-distill-llama-70b',
  'gemma2-9b-it',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama-guard-3-8b',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-guard-4-12b',
  'mistral-saba-24b',
  'moonshotai/kimi-k2-instruct',
  'moonshotai/kimi-k2-instruct-0905',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen-qwq-32b',
  'qwen/qwen3-32b',
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
