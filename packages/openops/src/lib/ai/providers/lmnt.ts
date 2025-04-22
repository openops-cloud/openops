import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

const lmntModels = ['aurora', 'blizzard'];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}): LanguageModelV1 {
  throw new Error('Not implemented');
}

export const lmntProvider: AiProvider = {
  models: lmntModels,
  createLanguageModel,
};
