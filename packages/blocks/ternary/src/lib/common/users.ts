import { HttpMethod } from '@openops/blocks-common';
import { ternaryAuth } from './auth';
import { sendTernaryRequest } from './index';

export async function getUsersList(
  auth: ternaryAuth,
  includeSettings = false,
): Promise<unknown[]> {
  const response = await sendTernaryRequest({
    auth: auth,
    method: HttpMethod.GET,
    url: 'users',
    queryParams: {
      tenantID: auth.tenantId,
      includeSettings: `${includeSettings}`,
    },
  });

  return response.body;
}
