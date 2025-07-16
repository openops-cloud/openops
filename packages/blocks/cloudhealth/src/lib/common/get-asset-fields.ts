import { makeGetRequest } from './call-rest-api';

export async function getAssetFields(
  apiKey: string,
  assetType: string,
): Promise<{ name: string; type: string }[]> {
  const response: any = await makeGetRequest(apiKey, `/api/${assetType}`);

  return response.attributes?.map((field: any) => ({
    name: field.name,
    type: field.type,
  }));
}
