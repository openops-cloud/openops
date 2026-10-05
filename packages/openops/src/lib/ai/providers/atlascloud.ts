// https://atlascloud.ai/docs
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const ATLAS_CLOUD_BASE_URL = 'https://api.atlascloud.ai/v1';

// Atlas Cloud ships no dedicated AI SDK package, so there is no model-id type
// to generate this list from and it is not part of `tools/scripts/sync-models`.
// These ids come from the gateway's public catalog
// (GET https://api.atlascloud.ai/v1/models), read 2026-10-05.
const atlasCloudModels = [
  'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'deepseek-ai/DeepSeek-V3.1',
  'deepseek-ai/DeepSeek-V3.1-Terminus',
  'deepseek-ai/DeepSeek-V3.2-Exp',
  'moonshotai/kimi-k2.6',
  'moonshotai/kimi-k3',
  'zai-org/GLM-4.6',
  'zai-org/glm-4.7',
  'zai-org/glm-5',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createOpenAICompatible({
    name: 'atlascloud',
    apiKey: params.apiKey,
    baseURL: ATLAS_CLOUD_BASE_URL,
    ...params.providerSettings,
  })(params.model);
}

export const atlasCloudProvider: AiProvider = {
  models: atlasCloudModels,
  createLanguageModel,
};
