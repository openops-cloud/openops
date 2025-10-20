import { httpClient, HttpMethod } from '@openops/blocks-common';
import { ServiceNowAuth } from './auth';
import { buildServiceNowApiUrl } from './build-api-url';
import { generateAuthHeader } from './generate-auth-header';

export interface ServiceNowTableField {
  column_label: string;
  element: string;
  internal_type?: {
    value: string;
  };
  max_length?: string;
  mandatory?: string;
  read_only?: string;
  primary?: string;
  choice?: string;
  reference?: string;
}

export async function getServiceNowTableFields(
  auth: ServiceNowAuth,
  tableName: string,
): Promise<ServiceNowTableField[]> {
  const response = await httpClient.sendRequest<{
    result: ServiceNowTableField[];
  }>({
    method: HttpMethod.GET,
    url: buildServiceNowApiUrl(auth, 'sys_dictionary'),
    headers: {
      ...generateAuthHeader({
        username: auth.username,
        password: auth.password,
      }),
      Accept: 'application/json',
    },
    queryParams: {
      sysparm_query: `name=${tableName}`,
      sysparm_fields:
        'column_label,element,internal_type,max_length,mandatory,read_only,primary,choice,reference',
      sysparm_limit: '1000',
    },
  });

  return (
    response.body.result?.filter(
      (field) => field.element && field.element.trim() !== '',
    ) || []
  );
}
