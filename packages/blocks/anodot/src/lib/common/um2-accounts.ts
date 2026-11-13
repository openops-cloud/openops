import { makeHttpRequest } from '@openops/common';
import { createAnodotAuthHeaders } from './anodot-requests-helpers';
import { AnodotTokens } from './auth';

/**
 * Account as returned by the User Management 2.0 accounts endpoint.
 * `accountKey` and `accountId` carry the same string value on 2.0 tenants.
 */
export interface Um2Account {
  accountKey: string;
  accountId: string;
  accountName: string;
  cloudTypeId: number;
  isAllAccounts?: boolean;
  isDirectAccount?: boolean;
  isOwnedByReseller?: boolean;
}

export async function getUm2Accounts(
  apiUrl: string,
  tokens: AnodotTokens,
): Promise<Um2Account[]> {
  const url = `${apiUrl}/v2/user-management/accounts/management`;

  const headers = createAnodotAuthHeaders(tokens.Authorization, tokens.apikey);

  return makeHttpRequest<Um2Account[]>('GET', url, headers);
}
