import { HttpMethod } from '@openops/blocks-common';
import { getEnumValues } from './get-enum-values';
import { makeRequest } from './make-request';

export async function getIntegrations(
  auth: any,
  provider?: string,
  limit?: number,
): Promise<{ integrations: any[] }> {
  const queryParams: Record<string, string> =
    provider && provider.length > 0 ? { provider: provider } : {};

  if (limit) {
    queryParams['limit'] = limit.toString();
  }

  return await makeRequest({
    auth,
    endpoint: '/integrations',
    method: HttpMethod.GET,
    queryParams,
  });
}

export async function getProviders(): Promise<
  { label: string; value: string }[]
> {
  const providers = await getEnumValues('/integrations', 'provider');

  return providers.map((provider: any) => ({
    label: provider,
    value: provider,
  }));
}
