import { HttpMethod } from '@openops/blocks-common';
import { CloudabilityAuth } from '../auth';
import { makeRequest } from './make-request';

export async function getRecommendations({
  auth,
  vendor,
  type,
  duration,
  limit,
  filters,
  basis,
  includeSnoozed,
}: {
  auth: CloudabilityAuth;
  vendor: Vendor;
  type: string;
  duration: Duration;
  limit: number | undefined;
  filters: string[];
  basis: CostBasis;
  includeSnoozed: IncludeSnoozed;
}): Promise<any[]> {
  const url = `/rightsizing/${vendor}/recommendations/${type}`;

  const response = await makeRequest({
    auth,
    endpoint: url,
    method: HttpMethod.GET,
    queryParams: {
      duration,
      basis,
      filters: filters.join(','),
      ...(includeSnoozed === 'NO_SNOOZED' ? {} : { option: includeSnoozed }),
      ...(limit ? { limit: limit.toString() } : {}),
    },
  });

  return response;
}

export enum Vendor {
  AWS = 'AWS',
  Azure = 'Azure',
  GCP = 'GCP',
  Containers = 'Containers',
}
export enum Duration {
  TenDay = 'ten-day',
  ThirtyDay = 'thirty-day',
}
export enum CostBasis {
  OnDemand = 'on-demand',
  Effective = 'effective',
}

export enum IncludeSnoozed {
  NO_SNOOZED = 'NO_SNOOZED',
  INCLUDE_SNOOZED = 'INCLUDE_SNOOZED',
  ONLY_SNOOZED = 'ONLY_SNOOZED',
}
