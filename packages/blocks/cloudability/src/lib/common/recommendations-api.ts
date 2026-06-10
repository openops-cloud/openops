import { HttpMethod } from '@openops/blocks-common';
import { Vendor } from '@openops/common';
import { isEmpty } from '@openops/shared';
import { format } from 'date-fns';
import { CloudabilityAuth } from '../auth';
import { makeRequest } from './make-request';

// The recommendations API only accepts account ids as a GET query param, and
// nginx rejects request lines longer than its buffer (8KB by default) with a
// 414 Request-URI Too Large. The exact limit of Cloudability's edge is
// unknown, so this is a conservative educated guess: 4000 pre-encoded chars
// (~307 AWS account ids) inflate to ~4.6KB on the wire once URLSearchParams
// encodes each comma as %2C, leaving ~40% headroom below the 8KB default for
// the path and the remaining query params.
const MAX_VENDOR_ACCOUNT_IDS_QUERY_LENGTH = 4000;

function chunkByJoinedLength(values: string[], maxLength: number): string[][] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const value of values) {
    // +1 accounts for the joining comma
    const lengthWithValue =
      currentLength + (currentChunk.length > 0 ? 1 : 0) + value.length;
    if (currentChunk.length > 0 && lengthWithValue > maxLength) {
      chunks.push(currentChunk);
      currentChunk = [value];
      currentLength = value.length;
    } else {
      currentChunk.push(value);
      currentLength = lengthWithValue;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export async function getRecommendations({
  auth,
  vendor,
  recommendationType,
  duration,
  limit,
  filters,
  basis,
  snoozedFilter,
  vendorAccountIds,
}: {
  auth: CloudabilityAuth;
  vendor: Vendor;
  recommendationType: string;
  duration: Duration;
  limit: string | undefined;
  filters: string[];
  basis: CostBasis;
  snoozedFilter: SnoozedFilter;
  vendorAccountIds?: string[];
}): Promise<any> {
  const isAwsRedshift =
    vendor === Vendor.AWS && recommendationType === 'redshift';
  const url = isAwsRedshift
    ? `/rightsizing/${vendor}/underutilized/redshift`
    : `/rightsizing/${vendor}/recommendations/${recommendationType}`;

  const hasValidLimit = !(
    !limit ||
    isEmpty(limit) ||
    Number.isNaN(Number(limit))
  );
  const baseQueryParams = {
    duration,
    ...(isAwsRedshift ? {} : { basis }),
    filters: filters.join(','),
    ...(snoozedFilter === 'NO_SNOOZED' ? {} : { options: snoozedFilter }),
    ...(hasValidLimit ? { limit: limit, offset: '0' } : {}),
  };

  const accountIdChunks =
    vendorAccountIds && vendorAccountIds.length > 0
      ? chunkByJoinedLength(
          vendorAccountIds,
          MAX_VENDOR_ACCOUNT_IDS_QUERY_LENGTH,
        )
      : [undefined];

  // Chunked requests run concurrently; Promise.all preserves chunk order so
  // the merged result stays deterministic.
  const responses = await Promise.all(
    accountIdChunks.map((chunk) =>
      makeRequest({
        auth,
        endpoint: url,
        method: HttpMethod.GET,
        queryParams: {
          ...baseQueryParams,
          ...(chunk ? { vendorAccountIds: chunk.join(',') } : {}),
        },
      }),
    ),
  );

  // A single request keeps the response shape untouched for downstream consumers.
  if (responses.length === 1) {
    return responses[0];
  }

  // The rightsizing API wraps recommendations as { result: [...] }; merge the
  // arrays across chunks and keep the shape the API responded with.
  const merged = responses.flatMap((response) =>
    Array.isArray(response) ? response : response?.result ?? [],
  );
  // When chunked, apply the limit after merging; this truncates results in
  // chunk request order (and whatever order the API returns within each
  // chunk), which may differ from the ranking a single limited request
  // would return.
  const limited = hasValidLimit ? merged.slice(0, Number(limit)) : merged;

  if (Array.isArray(responses[0])) {
    return limited;
  }

  // Chunks cover disjoint account sets, so counts genuinely add up; the other
  // meta fields (aggregates, info) are undocumented and cannot be merged
  // safely, so only totalCount is synthesized.
  return { meta: { totalCount: merged.length }, result: limited };
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

  const snoozedUntilValue =
    snoozeUntil?.toLowerCase() === 'never'
      ? 'never'
      : format(new Date(snoozeUntil), 'yyyy-MM-dd');

  const response = await makeRequest({
    auth,
    endpoint: url,
    method: HttpMethod.POST,
    body: {
      expiresOn: snoozedUntilValue,
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

export enum Duration {
  TenDay = 'ten-day',
  ThirtyDay = 'thirty-day',
}

export enum CostBasis {
  OnDemand = 'on-demand',
  Effective = 'effective',
}

export enum SnoozedFilter {
  NO_SNOOZED = 'NO_SNOOZED',
  INCLUDE_SNOOZED = 'INCLUDE_SNOOZED',
  ONLY_SNOOZED = 'ONLY_SNOOZED',
}
