import { AiProvider } from '../providers';

const mistralModels = [
  'ministral-3b-latest',
  'ministral-8b-latest',
  'mistral-large-latest',
  'mistral-small-latest',
  'pixtral-large-latest',
  'pixtral-12b-2409',
  'open-mistral-7b',
  'open-mixtral-8x7b',
  'open-mixtral-8x22b',
];

export const mistralProvider: AiProvider = {
  models: mistralModels,
};
