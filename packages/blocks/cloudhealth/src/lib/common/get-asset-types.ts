import { makeGetRequest } from './call-rest-api';

export async function getAssetTypes(apiKey: string): Promise<string[]> {
  return await makeGetRequest<string>(apiKey, `/api`);
}
