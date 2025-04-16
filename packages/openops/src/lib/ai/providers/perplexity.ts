import { AiProvider } from '../providers';

const perplexityModels = [
  'sonar-reasoning-pro',
  'sonar-reasoning',
  'sonar-pro',
  'sonar',
];

export const perplexityProvider: AiProvider = {
  models: perplexityModels,
};
