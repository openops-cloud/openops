import { HttpMethod } from '@openops/blocks-common';
import { isEmpty } from '@openops/shared';
import { CloudabilityAuth } from '../auth';
import { makeRequest } from './make-request';

export async function getRecommendations({
  auth,
  vendor,
  recommendationType,
  duration,
  limit,
  filters,
  basis,
  includeSnoozed,
}: {
  auth: CloudabilityAuth;
  vendor: Vendor;
  recommendationType: string;
  duration: Duration;
  limit: string | undefined;
  filters: string[];
  basis: CostBasis;
  includeSnoozed: IncludeSnoozed;
}): Promise<any[]> {
  const url = `/rightsizing/${vendor}/recommendations/${recommendationType}`;

  const response = await makeRequest({
    auth,
    endpoint: url,
    method: HttpMethod.GET,
    queryParams: {
      duration,
      basis,
      filters: filters.join(','),
      ...(includeSnoozed === 'NO_SNOOZED' ? {} : { options: includeSnoozed }),
      ...(!limit || isEmpty(limit) ? {} : { limit: limit, offset: '0' }),
    },
  });

  return response;
}

export async function snoozeRecommendations({
  auth,
  vendor,
  recommendationType,
  accountId,
  resourceIds,
  snoozeUntil,
}: {
  auth: CloudabilityAuth;
  vendor: Vendor;
  recommendationType: string;
  accountId: string;
  resourceIds: string[];
  snoozeUntil: string;
}): Promise<any> {
  const url = `/rightsizing/${vendor}/recommendations/${recommendationType}/snooze`;

  const response = await makeRequest({
    auth,
    endpoint: url,
    method: HttpMethod.POST,
    body: {
      expiresOn: snoozeUntil,
      resources: {
        [accountId]: resourceIds,
      },
    },
  });

  return response;
}

export async function unsnoozeRecommendations({
  auth,
  vendor,
  recommendationType,
  accountId,
  resourceIds,
}: {
  auth: CloudabilityAuth;
  vendor: Vendor;
  recommendationType: string;
  accountId: string;
  resourceIds: string[];
}): Promise<any> {
  const url = `/rightsizing/${vendor}/recommendations/${recommendationType}/unsnooze`;

  const response = await makeRequest({
    auth,
    endpoint: url,
    method: HttpMethod.POST,
    body: {
      resources: {
        [accountId]: resourceIds,
      },
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
