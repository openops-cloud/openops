import { BASE_CH_URL } from './base-url';
import { makeGetRequest } from './call-rest-api';

export async function getAssetTypes(apiKey: string): Promise<string[]> {
  const response = await makeGetRequest<string>(apiKey, `${BASE_CH_URL}/api`);

  return response;
}
