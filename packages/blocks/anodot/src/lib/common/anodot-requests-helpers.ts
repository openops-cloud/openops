import { AxiosHeaders } from 'axios';
import type { UmbrellaAccount } from './umbrella-accounts';

export function createAnodotAuthHeaders(
  authorization: string,
  apikey: string,
): AxiosHeaders {
  return new AxiosHeaders({
    'Content-Type': 'application/json',
    Authorization: authorization,
    apikey: apikey,
  });
}

/**
 * Builds the per-account `apikey` header value.
 *
 * User Management 1.0 keys are `userKey:accountKey:divisionId`.
 * User Management 2.0 keys are `userKey:accountId:costCenterId`, where a blank
 * cost center means "all cost centers". A nil `divisionId` therefore yields a
 * blank third segment; `0` is a real 1.0 division and must be kept.
 */
export function buildUserAccountApiKey(
  apikey: string,
  accountKey: string,
  divisionId?: string | number | null,
): string {
  const sanitizedApiKey = apikey.replace(/:-.*$/, '');

  return `${sanitizedApiKey}:${accountKey}:${divisionId ?? ''}`;
}

export function buildAccountApiKeyForAccount(
  apikey: string,
  account: Pick<UmbrellaAccount, 'accountKey' | 'divisionId'>,
): string {
  return buildUserAccountApiKey(
    apikey,
    String(account.accountKey),
    account.divisionId,
  );
}
