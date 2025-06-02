import { ConnectionProvider, Provider } from './providers';
import { providerMap } from './providers-map';

function getAll(): Provider[] {
  return Object.values(providerMap);
}

function getOne(id: ConnectionProvider): Provider {
  return providerMap[id];
}

export const connectionProviders = {
  getAll,
  getOne,
};
