// https://docs.x.ai/docs/models
import { createXai } from '@ai-sdk/xai';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const xaiModels = [
  'grok-2',
  'grok-2-1212',
  'grok-2-image',
  'grok-2-image-1212',
  'grok-2-image-latest',
  'grok-2-latest',
  'grok-2-vision',
  'grok-2-vision-1212',
  'grok-2-vision-latest',
  'grok-3',
  'grok-3-fast',
  'grok-3-fast-latest',
  'grok-3-latest',
  'grok-3-mini',
  'grok-3-mini-latest',
  'grok-4',
  'grok-4-0709',
  'grok-4-1-fast-non-reasoning',
  'grok-4-1-fast-reasoning',
  'grok-4-fast-non-reasoning',
  'grok-4-fast-reasoning',
  'grok-4-latest',
  'grok-beta',
  'grok-code-fast-1',
  'grok-vision-beta',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createXai({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const xaiProvider: AiProvider = {
  models: xaiModels,
  createLanguageModel,
};
