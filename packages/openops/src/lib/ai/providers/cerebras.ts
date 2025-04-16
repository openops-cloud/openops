import { AiProvider } from '../providers';

const cerebrasModels = ['llama3.1-8b', 'llama3.1-70b', 'llama-3.3-70b'];

export const cerebrasProvider: AiProvider = {
  models: cerebrasModels,
};
