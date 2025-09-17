import { makeGetRequest } from './call-rest-api';

export async function searchAssets(
  apiKey: string,
  assetType: string,
  fields: { fieldName: string; value: string }[],
): Promise<any[]> {
  const queryParams = {
    name: assetType,
    query: ((fields as any).fields ?? [])
      .map((f: any) => `${f.fieldName}='${f.value}'`)
      .join('&'),
    api_version: '2',
  };

  const response = await makeGetRequest(apiKey, `/api/search`, queryParams);

  return response.body;
}
