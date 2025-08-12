import { HttpMethod } from '@openops/blocks-common';
import { cacheWrapper } from '@openops/server-shared';
import { VegaCloudAuth } from '../auth';
import { makeRequest } from './make-request';

const cacheKey = 'openops-vegacloud-anomaly-fields';

export async function getAnomalyFields(auth: VegaCloudAuth): Promise<any[]> {
  let fields = await cacheWrapper.getSerializedObject<string[]>(cacheKey);

  if (!fields) {
    fields = await getFields(auth);

    await cacheWrapper.setSerializedObject(cacheKey, fields);
  }

  return fields;
}

async function getFields(auth: VegaCloudAuth): Promise<string[]> {
  const response = await makeRequest({
    auth,
    url: 'https://data.api.vegacloud.io/query/schema',
    method: HttpMethod.GET,
  });

  return (
    response.result?.find(
      (x: { model_name: string; fields: any[] }) => x.model_name === 'Anomaly',
    )?.fields || []
  );
}
