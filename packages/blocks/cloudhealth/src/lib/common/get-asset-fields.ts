import { makeGetRequest } from './call-rest-api';

export async function getAssetFields(
  apiKey: string,
  assetType: string,
): Promise<{ name: string; type: string }[]> {
  const response = await makeGetRequest(apiKey, `/api/${assetType}`);

  return response.body.attributes;
}
