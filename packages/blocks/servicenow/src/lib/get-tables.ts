import { httpClient, HttpMethod } from '@openops/blocks-common';
import { ServiceNowAuth } from './auth';
import { generateAuthHeader } from './generate-auth-header';

export interface ServiceNowTable {
  name: string;
  label: string;
}

export async function getServiceNowTables(
  auth: ServiceNowAuth,
): Promise<ServiceNowTable[]> {
  const response = await httpClient.sendRequest<{
    result: ServiceNowTable[];
  }>({
    method: HttpMethod.GET,
    url: `https://${auth.instanceName}.service-now.com/api/now/table/sys_db_object`,
    headers: {
      ...generateAuthHeader({
        username: auth.username,
        password: auth.password,
      }),
      Accept: 'application/json',
    },
    queryParams: {
      sysparm_fields: 'name,label',
      sysparm_limit: '10000',
      sysparm_query: 'nameSTARTSWITHx_',
    },
  });

  return response.body.result || [];
}
