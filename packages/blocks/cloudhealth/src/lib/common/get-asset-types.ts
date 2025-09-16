import { cacheWrapper } from '@openops/server-shared';
import { makeGetRequest } from './call-rest-api';

const cacheKey = 'openops-cloudhealth-asset-types';

export async function getAssetTypes(apiKey: string): Promise<string[]> {
  let assets = await cacheWrapper.getSerializedObject<string[]>(cacheKey);

  if (!assets) {
    assets = (await makeGetRequest(apiKey, `/api`)).body as string[];

    await cacheWrapper.setSerializedObject(cacheKey, assets);
  }

  return assets;
}
