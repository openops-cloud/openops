import { httpClient, HttpMethod } from '@openops/blocks-common';
import { ServiceNowAuth } from './auth';
import { generateAuthHeader } from './generate-auth-header';

export interface ServiceNowChoice {
  label: string;
  value: string;
}

/**
 * Fetches choice values for a specific field from ServiceNow sys_choice table
 */
export async function getServiceNowChoiceValues(
  auth: ServiceNowAuth,
  tableName: string,
  fieldName: string,
): Promise<ServiceNowChoice[]> {
  try {
    const response = await httpClient.sendRequest<{
      result: Array<{
        label: string;
        value: string;
      }>;
    }>({
      method: HttpMethod.GET,
      url: `https://${auth.instanceName}.service-now.com/api/now/table/sys_choice`,
      headers: {
        ...generateAuthHeader({
          username: auth.username,
          password: auth.password,
        }),
        Accept: 'application/json',
      },
      queryParams: {
        sysparm_query: `name=${tableName}^element=${fieldName}^inactive=false^language=en`,
        sysparm_fields: 'label,value',
        sysparm_limit: '1000',
      },
    });

    return (
      response.body.result?.map((choice) => ({
        label: choice.label || choice.value,
        value: choice.value,
      })) || []
    );
  } catch (error) {
    return [];
  }
}
