import { makeGetRequest } from './call-rest-api';

export async function searchAsset(
  apiKey: string,
  assetType: string,
  fields: { fieldName: string; value: string }[],
) {
  const queryParams = {
    name: assetType,
    query: ((fields as any).fields ?? [])
      .map((f: any) => `${f.fieldName}='${f.value}'`)
      .join('&'),
    api_version: '2',
  };

  const response: any = await makeGetRequest(
    apiKey,
    `/api/search`,
    queryParams,
  );

  return response;
}
