import { httpClient, HttpMethod } from '@openops/blocks-common';
import {
  buildServiceNowApiUrl,
  generateAuthHeader,
  ServiceNowAuth,
} from './auth';

export type ServiceNowTable = {
  name: string;
  label: string;
};

export async function getServiceNowTables(
  auth: ServiceNowAuth,
  search?: string,
): Promise<ServiceNowTable[]> {
  const queryParams: Record<string, string> = {
    sysparm_fields: 'name,label',
    sysparm_limit: '10000',
  };

  if (search) {
    queryParams['sysparm_query'] = `nameLIKE${search}^ORlabelLIKE${search}`;
  }

  const response = await httpClient.sendRequest<{
    result: ServiceNowTable[];
  }>({
    method: HttpMethod.GET,
    url: buildServiceNowApiUrl(auth, 'sys_db_object'),
    headers: {
      ...generateAuthHeader(auth),
      Accept: 'application/json',
    },
    queryParams,
  });

  return response.body.result || [];
}
