import { AiProvider } from '../providers';

const lmntModels = ['aurora', 'blizzard'];

export const lmntProvider: AiProvider = {
  getModels: () => lmntModels,
};
