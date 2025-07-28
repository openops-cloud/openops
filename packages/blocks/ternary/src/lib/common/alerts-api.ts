import { HttpMethod } from '@openops/blocks-common';
import { sendTernaryRequest } from './send-ternary-request';
import { ternaryAuth } from './auth';

export async function getCostAlerts(auth: ternaryAuth) {
  const response = await sendTernaryRequest({
    auth: auth,
    method: HttpMethod.GET,
    url: 'cost-alerts',
    queryParams: {
      tenantID: auth.tenantId,
    },
  });

  return response.body?.costAlerts as any[];
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  UNRESOLVED = 'UNRESOLVED',
}
