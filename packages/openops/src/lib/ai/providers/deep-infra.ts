import { createDeepInfra } from '@ai-sdk/deepinfra';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const deepInfraModels = [
  'MiniMaxAI/MiniMax-M2',
  'MiniMaxAI/MiniMax-M2.1',
  'MiniMaxAI/MiniMax-M2.5',
  'Qwen/Qwen3-Coder-480B-A35B-Instruct',
  'Qwen/Qwen3-Coder-480B-A35B-Instruct-Turbo',
  'anthropic/claude-3-7-sonnet-latest',
  'anthropic/claude-4-opus',
  'deepseek-ai/DeepSeek-R1-0528',
  'deepseek-ai/DeepSeek-V3.2',
  'moonshotai/Kimi-K2-Instruct',
  'moonshotai/Kimi-K2-Instruct-0905',
  'moonshotai/Kimi-K2-Thinking',
  'moonshotai/Kimi-K2.5',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'zai-org/GLM-4.5',
  'zai-org/GLM-4.6',
  'zai-org/GLM-4.6V',
  'zai-org/GLM-4.7',
  'zai-org/GLM-4.7-Flash',
  'zai-org/GLM-5',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createDeepInfra({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const deepinfraProvider: AiProvider = {
  models: deepInfraModels,
  createLanguageModel,
};
