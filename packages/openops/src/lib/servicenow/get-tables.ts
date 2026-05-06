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
  options?: { search?: string; query?: string; limit?: number },
): Promise<ServiceNowTable[]> {
  const queryParams: Record<string, string> = {
    sysparm_fields: 'name,label',
    sysparm_limit: String(options?.limit ?? 10000),
  };

  if (options?.search) {
    queryParams[
      'sysparm_query'
    ] = `nameLIKE${options.search}^ORlabelLIKE${options.search}`;
  } else if (options?.query) {
    queryParams['sysparm_query'] = options.query;
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
